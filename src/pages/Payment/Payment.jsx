import axios from 'axios';

const Payment = () => {

  const createCheckoutSession = async () => {
    // instantiate request body
    const currLoc = window.location.href;

    const reqBody = {
      from_url: currLoc
    }

    // create and retrieve checkout session information based on body
    const { data: checkoutSession} = 
      await axios.post(
        'http://localhost:5001/api/payment',
        reqBody
      );

    // redirect to Stripe if id and url found 
    if (checkoutSession?.id && checkoutSession?.url) {
      window.location.href = checkoutSession.url;
    }
  }

  return (
    <div className="w-full justify-items-center">
      <button
        onClick={createCheckoutSession}
        type="submit"
        className="w-1/10 text-white font-bold hover:cursor-pointer hover:bg-blue-300 bg-blue-500 text p-4 mx-auto rounded-xl"
      >
        Button
      </button>
    </div>
  );
};

export default Payment;