import {useState } from "react";
export default function Login(){
    const [form, setForm] = useState({ email: "", password: "",});
    const [error, setError] = useState("");

    // Forgot-password modal state 
    const [showReset, setShowReset] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [resetMsg, setResetMsg] = useState("");

    const onChange = (e) =>{
        const {name, value} = e.target;
        setForm(f =>({...f, [name]: value}));
        if(error) setError("");
    };

    const onSubmit = (e) =>{
        e.preventDefault();
        if(!form.email || !form.password){
            setError("Please fill in all required fields!");
            return;
        }
        // Call API login here
        console.log("Logging in", form);
    };

    // Open/submit handlers for reset popup
    const openReset = () => {
        setResetEmail("");
        setResetMsg("");
        setShowReset(true);
    };
    const sendReset = (e) => {
        e.preventDefault();
        const formEl = e.currentTarget; 
        if (!formEl.checkValidity()) {
            formEl.reportValidity();
            return;
        }
        // TODO: call backend reset endpoint here
        setResetMsg("If an account exists for that email, a reset link has been sent.");
    };

    return(
        <div className=''>
            <div className= "mx-2 md:mx-4 lg:mx-5 my-10 flex flex-col items-center">
                {/* Headline in serif font */}
                <h1 className="text-center text-3xl md:text-4xl lg:text-5xl font-serif font-extralight mb-8">
                    Log in to Your Account
                </h1>
                <form className="flex flex-col font-mono text-xs w-full max-w-xl" noValidate onSubmit={onSubmit}>
                    <label className="mb-4">
                        <p className="text-center text-brown py-3">EMAIL *</p>
                        <input
                            className="w-full text-center border-neutral-200 border-b py-3 text-sm focus:outline-none"
                            id="email" name="email" type="email" autoComplete="email" required
                            value={form.email} onChange={onChange}/>
                    </label>
                    <label className="mb-4">
                        <p className="text-center text-brown py-3">PASSWORD *</p>
                        <input
                            className="w-full text-center border-neutral-200 border-b py-3 text-sm focus:outline-none"
                            id="password" name="password" type="password" autoComplete="current-password" required
                            value={form.password} onChange={onChange}/>
                    </label>

                    {/* Forgot password link */}
                    <div className="text-center mt-2 mb-2">
                        <button
                            type="button"
                            onClick={openReset}
                            className="font-sans text-xs underline underline-offset-4 hover:opacity-80"
                        >
                            Forgot password?
                        </button>
                    </div>

                    {error && <p className="text-center text-red-600 text-xs mt-3 mb-1">{error}</p>}

                    <button className ='flex justify-center items-center w-1/2 mx-auto mt-6 mb-6 md:mb-8 lg:mb-10
                                        bg-brown hover:bg-[#AB8C4B] h-12 text-white text-sm font sans border-2 border-black rounded-md transition'
                            type="submit"
                            aria-label="login-button">
                             LOG IN
                    </button>
                </form>
            </div>

            {/* Modal popup for Forgot Password */}
            {showReset && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    role="dialog" aria-modal="true"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowReset(false); }}
                >
                    <div className="absolute inset-0 bg-black/50"></div>
                    <div className="relative bg-white w-11/12 max-w-md mx-auto p-6 md:p-8 border-2 border-black rounded-md shadow-lg">
                        <h2 className="text-center text-2xl font-serif font-extralight mb-4">Reset your password</h2>
                        <form className="flex flex-col font-mono text-xs" noValidate onSubmit={sendReset}>
                            <label>
                                <p className="text-center text-brown py-3">EMAIL *</p>
                                <input
                                    className="w-full text-center border-neutral-200 border-b py-3 text-sm focus:outline-none"
                                    type="email" required
                                    value={resetEmail}
                                    onChange={(e) => { setResetEmail(e.target.value); if (resetMsg) setResetMsg(""); }}
                                    placeholder="you@example.com"
                                />
                            </label>
                            {resetMsg && (
                                <p className="text-center text-xs mt-3 mb-1">{resetMsg}</p>
                            )}
                            <div className="flex items-center justify-center gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowReset(false)}
                                    className="px-4 py-2 bg-white text-black text-sm font-sans border-2 border-black rounded-md hover:opacity-80 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-brown hover:bg-[#AB8C4B] text-white text-sm font-sans border-2 border-black rounded-md transition"
                                >
                                    Send reset link
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}