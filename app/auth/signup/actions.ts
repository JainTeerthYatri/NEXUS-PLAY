"use server";

import { headers } from "next/headers";
import { authRatelimit } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase/server";

export async function handleSignupAction(formData: FormData) {
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

  if (!acceptTerms) {
    return { error: "You must accept the Terms and Conditions to register." };
  }

  const supabase = await createClient();

  // 4. Supabase Sign Up
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        display_name: displayName,
        accept_cookies: acceptCookies,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}