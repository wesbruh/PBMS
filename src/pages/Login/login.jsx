import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Login(){
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/dashboard";
    const { user, loading } = useAuth();

    const [form, setForm] = useState({ email: "", password: "",});
    const [error, setError] = useState("");

    // Forgot-password modal state 
    const [showReset, setShowReset] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [resetMsg, setResetMsg] = useState("");

    // If already authenticated (e.g., after clicking confirmation link), send to target page
    useEffect(() => {
        if (!loading && user) {
            navigate(from, { replace: true });
        }
    }, [from, loading, navigate, user]);

    const onChange = (e) =>{
        const {name, value} = e.target;
        setForm(f =>({...f, [name]: value}));
        if(error) setError("");
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!form.email || !form.password) {
            setError("Please fill in all required fields!");
            return;
        }

        const { error } = await supabase.auth.signInWithPassword({
            email: form.email,
            password: form.password,
        });

        if (error) {
            const msg = error.message?.toLowerCase() || "";
            if (msg.includes("email not confirmed")) {
            setError("Please confirm your email first. Check your inbox for the link.");
            } else {
            setError(error.message || "Unable to log in.");
            }
            return;
        }

        // we are logged in – update the User table
        const { data: userData, error: getErr } = await supabase.auth.getUser();
        if (getErr) {
            console.error("getUser after login failed:", getErr);
        }

        const authedUser = userData?.user;
        if (authedUser?.id) {
            const { error: updateErr } = await supabase
            .from("User")
            .update({
                is_active: true,
                last_login_at: new Date().toISOString(),
            })
            .eq("id", authedUser.id);

            if (updateErr) {
            // if you see this in console, you have RLS blocking it
            console.error("User update failed:", updateErr);
            }
        }

        navigate(from, { replace: true });
    };



    // Open/submit handlers for reset popup
    const openReset = () => {
        setResetEmail("");
        setResetMsg("");
        setShowReset(true);
    };
    const sendReset = async (e) => {
        e.preventDefault();

        const formEl = e.currentTarget;
        if (!formEl.checkValidity()) {
            formEl.reportValidity();
            return;
        }

        setResetMsg("");

        const redirectUrl = `${window.location.origin}/auth/callback`; // reuse callback

        const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
            redirectTo: redirectUrl,
        });

        if (error) {
            setResetMsg(error.message || "Could not send reset email.");
            return;
        }

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
                                        bg-brown hover:bg-[#AB8C4B] h-12 text-white text-sm font sans border border-black rounded-md transition cursor-pointer'
                            type="submit"
                            aria-label="login-button">
                             Log In
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
