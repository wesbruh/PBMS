// checkout.sessions.create
// checkout.sessions.retrieve
function createCheckoutSessionBuilder(checkoutSession, error) {
  return {
    create: (!error)
      ? jest.fn().mockResolvedValue(checkoutSession)
      : jest.fn().mockRejectedValue(new Error(error.message)),
    retrieve: (!error)
      ? jest.fn().mockResolvedValue(checkoutSession)
      : jest.fn().mockRejectedValue(new Error(error.message))
  };
}

function createPaymentIntentBuilder(paymentIntent, error) {
  return {
    retrieve: (!error)
      ? jest.fn().mockResolvedValue(paymentIntent)
      : jest.fn().mockRejectedValue(new Error(error.message)),
    capture: (!error)
      ? jest.fn().mockResolvedValue({...paymentIntent, status: "succeeded"})
      : jest.fn().mockRejectedValue(new Error(error.message)),
    cancel: (!error)
      ? jest.fn().mockResolvedValue(paymentIntent)
      : jest.fn().mockRejectedValue(new Error(error.message))
  };
}

function createRefundsBuilder(refund, error) {
  return {
    create: (!error)
      ? jest.fn().mockResolvedValue(refund)
      : jest.fn().mockRejectedValue(new Error(error.message))
  };
}

export function createStripeMock({ checkoutSession = null, paymentIntent = null, refund = null, error = null } = {}) {
  return {
    checkout: createCheckoutSessionBuilder(checkoutSession, error),
    paymentIntents: createPaymentIntentBuilder(paymentIntent, error),
    refunds: createRefundsBuilder(refund, error)
  };
}