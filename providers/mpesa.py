"""The mobile-money side of a pooled plan.

Only the shape of the exchange lives here. Three things are deliberate:

1. **We never see a PIN.** An STK push makes the customer's own phone ask for it. There is no field
   for a PIN anywhere in this codebase, and nothing here is ever logged beyond an id.
2. **Nothing but a callback marks a payment paid.** This module can start a payment; only
   `services.settle_payment` can finish one, and only from a callback the gateway sent.
3. **It is configured, not hardcoded.** `MPESA_*` settings are empty by default, in which case
   `request_payment` reports that it is not configured instead of pretending to charge anyone.

The field names follow Daraja's STK push, which is the documented one. The Tanzanian endpoint has
to be confirmed against live credentials before this is switched on — see docs/DECISIONS.md.
"""
import base64
import logging
from datetime import datetime

import requests
from django.conf import settings

logger = logging.getLogger(__name__)
TIMEOUT = 10


class NotConfigured(Exception):
    """No gateway credentials. The caller must not pretend a payment was started."""


class PushFailed(Exception):
    """The gateway refused or could not be reached."""


def _configured() -> bool:
    return bool(settings.MPESA_SHORTCODE and settings.MPESA_KEY and settings.MPESA_SECRET
                and settings.MPESA_BASE_URL)


def _token() -> str:
    r = requests.get(
        f'{settings.MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials',
        auth=(settings.MPESA_KEY, settings.MPESA_SECRET), timeout=TIMEOUT,
    )
    r.raise_for_status()
    token = r.json().get('access_token')
    if not token:
        raise PushFailed('No access token in the gateway response.')
    return token


def request_payment(*, phone: str, amount_tsh: int, reference: str, description: str) -> str:
    """Ask the customer's phone to approve a payment. Returns the gateway's checkout id."""
    if not _configured():
        raise NotConfigured('Mobile money is not configured on this server.')

    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    password = base64.b64encode(
        f'{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}'.encode()
    ).decode()
    payload = {
        'BusinessShortCode': settings.MPESA_SHORTCODE,
        'Password': password,
        'Timestamp': timestamp,
        'TransactionType': 'CustomerPayBillOnline',
        'Amount': amount_tsh,
        'PartyA': phone,
        'PartyB': settings.MPESA_SHORTCODE,
        'PhoneNumber': phone,
        'CallBackURL': settings.MPESA_CALLBACK_URL,
        'AccountReference': reference[:12],
        'TransactionDesc': description[:60],
    }
    try:
        r = requests.post(f'{settings.MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest',
                          json=payload, headers={'Authorization': f'Bearer {_token()}'}, timeout=TIMEOUT)
        r.raise_for_status()
        body = r.json()
    except requests.RequestException as e:
        # No numbers, no payloads: just that it failed.
        logger.warning('Mobile money push failed for reference %s: %s', reference, type(e).__name__)
        raise PushFailed('The payment request could not be sent.') from e

    checkout_id = body.get('CheckoutRequestID')
    if not checkout_id:
        logger.warning('Mobile money push for %s returned no checkout id', reference)
        raise PushFailed(body.get('errorMessage') or 'The gateway refused the request.')
    return checkout_id


def read_callback(body: dict) -> dict:
    """Pull the few fields that matter out of a gateway callback.

    Returns `{checkout_id, success, receipt, amount}`. Anything missing comes back as None rather
    than raising: a callback we cannot read must still be stored, not dropped.
    """
    stk = (body or {}).get('Body', {}).get('stkCallback', {})
    items = {item.get('Name'): item.get('Value')
             for item in (stk.get('CallbackMetadata') or {}).get('Item', [])}
    result_code = stk.get('ResultCode')
    return {
        'checkout_id': stk.get('CheckoutRequestID'),
        'success': str(result_code) == '0',
        'receipt': items.get('MpesaReceiptNumber'),
        'amount': items.get('Amount'),
    }
