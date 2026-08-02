"use server";

import { headers } from "next/headers";
import { authRatelimit } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase/server";

export async function handleSignupAction(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  // 1. Get client IP address for rate limiting
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") ?? "127.0.0.1";

  // 2. Check Upstash Rate Limit (5 attempts per 60 seconds)
  const { success, reset } = await authRatelimit.limit(ip);

  if (!success) {
    const waitTime = Math.ceil((reset - Date.now()) / 1000);
    return { 
      error: `Too many signup attempts. Please try again after ${waitTime} seconds.` 
    };
  }

  // 3. Extract form data fields
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const username = formData.get("username") as string;
  const displayName = formData.get("displayName") as string;
  const acceptTerms = formData.get("acceptTerms") === "on";
  const acceptCookies = formData.get("acceptCookies") === "on";

  if (!acceptTerms || !acceptCookies) {
    return { error: "You must accept both the Terms & Conditions and Cookies Policy to register." };
  }

  const supabase = await createClient();

  // 4. Check if Username already exists in the profiles table
  const { data: existingUser, error: usernameCheckError } = await supabase
    .from("profiles")
    .select("username")
    .eq("username", username)
    .maybeSingle();

  if (existingUser) {
    return { error: "This username is already taken by an authorized user" };
  }

  // 5. Supabase Sign Up
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
