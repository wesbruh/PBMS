import {useState} from "react";
export default function SignUp(){
    const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "", }
    );
    const[error, setError] = useState("");

    const onChange = (e) => {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
        if(name === "confirmPassword" || name === "password")
            setError("");
        };
    const onSubmit = (e) => {
        e.preventDefault();
        if(form.password !== form.confirmPassword){
            setError("Passwords do not match");
            return;
        }
        // Proceed with form submission (e.g., API call)
        console.log("Create Account", form);
    };

    return(
        <div className = ''>
            <div className= "mx-2 md:mx-4 lg:mx-5 my-10 flex flex-col items-center">
                {/* Headline in serif font */}
                <h1 className="text-center text-3xl md:text-4xl lg:text-5xl font-serif font-extralight mb-8">
                Create Your Account
                </h1>

                <form className="flex flex-col font-mono text-xs w-full max-w-xl" noValidate onSubmit={onSubmit}>
                    <label className="mb-4">
                         <p className="text-center text-brown py-3">FIRST NAME *</p>
                         <input
                         className="w-full text-center border-neutral-200 border-b py-3 text-sm focus:outline-none"
                         id="firstName" name="firstName" type="text" autoComplete="given-name" required
                         value={form.firstName} onChange={onChange}/>
                   </label>

                   <label className="mb-4">
                        <p className="text-center text-brown py-3">LAST NAME *</p>
                        <input
                            className="w-full text-center border-neutral-200 border-b py-3 text-sm focus:outline-none"
                            id="lastName" name="lastName" type="text" autoComplete="family-name" required
                            value={form.lastName} onChange={onChange}/>
                   </label>

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
                    id="password" name="password" type="password" autoComplete="new-password" required
                    value={form.password} onChange={onChange}/>
                   </label>

                   <label className="mb-2">
                    <p className="text-center text-brown py-3">CONFIRM PASSWORD *</p>
                    <input
                    className="w-full text-center border-neutral-200 border-b py-3 text-sm focus:outline-none"
                    id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required
                    value={form.confirmPassword} onChange={onChange}/>
                   </label>

                   {error && (
                    <p className="text-center text-red-600 text-xs mt-3 mb-1">{error}</p>
                   )}

                   <button
                     className="flex justify-center items-center w-1/2 mx-auto mt-6 mb-6 md:mb-8 lg:mb-10
                                bg-brown hover:bg-[#AB8C4B] h-12 text-white text-sm font-sans border-2 border-black rounded-md transition"
                     type="submit"
                     aria-label="Create account">
                     CREATE ACCOUNT
                   </button>
                </form>
            </div>
        </div>
    );
            
}