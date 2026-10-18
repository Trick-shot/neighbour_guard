"""Phone number handling, in one place so the OTP flow, contacts and the SMS webhook agree."""
import re

TZ_PATTERN = re.compile(r'^\+255[67]\d{8}$')


def format_phone_number(phone: str) -> str:
    """Normalise a Tanzanian number to +255……. Returns the input unchanged if it is not one."""
    phone = (phone or '').replace(' ', '').replace('-', '')
    if phone.startswith('0'):
        return '+255' + phone[1:]
    if phone.startswith('255'):
        return '+' + phone
    return phone


def normalise_tz_phone(phone: str) -> str | None:
    """Normalised number, or None when it is not a Tanzanian mobile number."""
    number = format_phone_number(phone)
    return number if TZ_PATTERN.match(number) else None
