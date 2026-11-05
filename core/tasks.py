from celery import shared_task


@shared_task(ignore_result=True)
def send_sign_in_code_sms(phone: str, code: str):
    """Text a sign-in code. A task, because an SMS gateway is slow and must not hold a request."""
    from core.sms import send_sms
    send_sms(f'Your NeighbourGuard sign-in code is {code}. It expires in 10 minutes.', [phone])
