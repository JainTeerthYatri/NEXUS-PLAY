"use server";

import { headers } from "next/headers";
import { authRatelimit } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase/server";

export async function handleSignupAction(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  // 1. Extract form data fields first to check validation
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const username = formData.get("username") as string;
  const displayName = formData.get("displayName") as string;
  const acceptTerms = formData.get("acceptTerms") === "on";
  const acceptCookies = formData.get("acceptCookies") === "on";

  if (!acceptTerms || !acceptCookies) {
    return { error: "You must accept both the Terms & Conditions and Cookies Policy to register." };
  }

  // 2. Server-side password policy validation (>= 10 chars, 1 uppercase, 1 number, 1 special char)
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/;

  if (!passwordRegex.test(password)) {
    return {
      error: "Password must be at least 10 characters long and contain at least one uppercase letter, one number, and one special character.",
    };
  }

  // 3. Get client IP address for rate limiting
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") ?? "127.0.0.1";

  // 4. Check Upstash Rate Limit (5 attempts per 60 seconds)
  const { success, reset } = await authRatelimit.limit(ip);

  if (!success) {
    const waitTime = Math.ceil((reset - Date.now()) / 1000);
    return { 
      error: `Too many signup attempts. Please try again after ${waitTime} seconds.` 
    };
  }

  const supabase = await createClient();

  // 5. Check if Username already exists in the profiles table
  const { data: existingUser, error: usernameCheckError } = await supabase
    .from("profiles")
    .select("username")
    .eq("username", username)
    .maybeSingle();

  if (existingUser) {
    return { error: "This username is already taken by an authorized user" };
  }

  // 6. Supabase Sign Up
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        display_name: displayName,
      },
    },
  });

  if (error) {
    let errorMsg = error?.message || "An unexpected database or auth error occurred.";
    
    // Check if error is related to existing email
    if (
      errorMsg.toLowerCase().includes("already registered") || 
      errorMsg.toLowerCase().includes("already exists") ||
      errorMsg.toLowerCase().includes("email address")
    ) {
      errorMsg = "if email is in our data then (this email is already in use)";
    }
    
    return { error: errorMsg };
  }

  return { success: true };
}
