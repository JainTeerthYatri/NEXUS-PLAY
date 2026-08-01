"use server";

import { headers } from "next/headers";
import { authRatelimit } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase/server";

export async function handleLoginAction(formData: FormData) {
  // 1. Get client IP address for rate limiting
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") ?? "127.0.0.1";

  // 2. Check Upstash Rate Limit (5 attempts per 60 seconds)
  const { success, reset } = await authRatelimit.limit(ip);

  if (!success) {
    const waitTime = Math.ceil((reset - Date.now()) / 1000);
    return { 
      error: `Too many login attempts. Please try again after ${waitTime} seconds.` 
    };
  }

  // 3. Supabase Authentication
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}