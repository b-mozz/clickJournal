"use client"
import { useState } from "react";

export function SignupForm() {
    const [error, setError] = useState<string | null>(null)
    const [pending, setPending] = useState(false)
    const [success, setSuccess] = useState(false)

    async function onSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        try {//pending true success false error null
            setPending(true)
            setSuccess(false)
            setError(null)
            const response = await fetch("/api/user", {
                method: "POST",
                body: JSON.stringify({
                    username: event.target.username.value,
                    email: event.target.email.value
                })
                //pending false success true error null
            });
            const data = await response.json();

            if(!response.ok){
                throw new Error(data.message || "singup failed")
            }
            setPending(false)
            setSuccess(true)
            setError(null)
        } catch (error) {
            setPending(false)
            setSuccess(false)
            setError("There was an error")
            //pending false success false error "there was an error"
        }
    }
    return (<form id="signupForm" onSubmit={onSubmit}>
        {/**show error message here if not null, show success if true */
            error && (<p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-red-700">{error}</p>)
        }
        {
            success && (<p role="status" className="">Account successfully created!</p>)
        }   
        <strong>ClickJournal</strong>
        <br></br>
        <div className="mt-4 flex flex-col gap-1.5">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" name="email" required 
            className="rounded-md border border-gray-400 px-2 py-2 focus:outline-2 focus:outline-offset-1 focus:outline-blue-500"></input>

            <label htmlFor="username">Username</label>
            <input type="text" id="username" name="username" required
            className="rounded-md border border-gray-400 px-2 py-2 focus:outline-2 focus:outline-offset-1 focus:outline-blue-500"></input>
        </div>
        <button type="submit" disabled={pending}
        className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50">Sign Up</button>
    </form>)
}