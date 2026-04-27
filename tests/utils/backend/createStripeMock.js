const defaultError = { message: "Method not initialized." }

function createCheckoutSessionBuilder(checkoutSession) {
  return {
    create: (!checkoutSession?.error)
      ? jest.fn().mockResolvedValue(checkoutSession)
      : jest.fn().mockRejectedValue(checkoutSession.error ?? defaultError),
    retrieve: jest.fn().mockResolvedValue(checkoutSession)
  };
}

function createPaymentIntentBuilder(paymentIntent) {
  return {
    retrieve: jest.fn().mockResolvedValue(paymentIntent),
    capture: (!paymentIntent?.error)
      ? jest.fn().mockResolvedValue({ ...paymentIntent, status: "succeeded" })
      : jest.fn().mockRejectedValue(paymentIntent.error ?? defaultError.message),
    cancel: (!paymentIntent?.error)
      ? jest.fn().mockResolvedValue({ ...paymentIntent, status: "cancelled"})
      : jest.fn().mockRejectedValue(paymentIntent.error ?? defaultError.message)
  };
}

function createRefundsBuilder(refund) {
  return {
    create: (!refund?.error)
      ? jest.fn().mockResolvedValue(refund)
      : jest.fn().mockRejectedValue(refund.error ?? defaultError)
  };
}

export function createStripeMock({ checkoutSession = {}, paymentIntent = {}, refund = {}} = {}) {
  return {
    checkout: { sessions: createCheckoutSessionBuilder(checkoutSession)},
    paymentIntents: createPaymentIntentBuilder(paymentIntent),
    refunds: createRefundsBuilder(refund)
  };
}