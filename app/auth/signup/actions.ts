// app/auth/signup/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";

export async function handleSignupAction(formData: FormData) {
  const username = (formData.get("username") as string)?.trim().toLowerCase();
  const displayName = (formData.get("displayName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const dob = formData.get("dob") as string;
  const isMinor = formData.get("isMinor") === "true";
  const guardianName = (formData.get("guardianName") as string)?.trim();
  const guardianEmail = (formData.get("guardianEmail") as string)?.trim().toLowerCase();
  const acceptTerms = formData.get("acceptTerms");

  // 1. Basic validation
  if (!username || !email || !password || !dob || !acceptTerms) {
    return { error: "Missing required registration parameters." };
  }

  if (username.length < 3 || username.length > 25 || !/^[a-zA-Z0-9_]+$/.test(username)) {
    return { error: "Username must be 3-25 alphanumeric characters or underscores." };
  }

  // 2. Minor / Guardian validation
  if (isMinor && (!guardianName || !guardianEmail)) {
    return { error: "Parent or legal guardian details are required for minor accounts." };
  }

  // 3. Password complexity enforcement
  const hasMinLength = password.length >= 10;
  const hasUppercase = /[A-Z]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasMinLength || !hasUppercase || !hasSpecialChar || !hasNumber) {
    return { error: "Password does not satisfy security complexity criteria." };
  }

  const supabase = await createClient();

  // 4. Check if username handle is already taken
  const { data: existingUser } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existingUser) {
    return { error: "This username handle is already registered." };
  }

  // 5. Authenticate and register user via Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        display_name: displayName || username,
        dob,
        is_minor: isMinor,
        guardian_name: isMinor ? guardianName : null,
        guardian_email: isMinor ? guardianEmail : null,
      },
    },
  });

  if (authError) {
    return { error: authError.message };
  }

  // 6. Ensure profile table record consistency
  if (authData.user) {
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: authData.user.id,
      username,
      display_name: displayName || username,
      role: "member",
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error("Profile upsert failure:", profileError.message);
    }
  }

  return { success: true };
}