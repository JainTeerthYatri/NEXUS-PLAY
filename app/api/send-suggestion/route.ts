import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, suggestions } = body;

    // 1. Strict input validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (
      !email ||
      typeof email !== "string" ||
      !emailRegex.test(email.trim()) ||
      !suggestions ||
      !Array.isArray(suggestions) ||
      suggestions.length === 0
    ) {
      return NextResponse.json(
        { error: "Invalid data provided." },
        { status: 400 }
      );
    }

    // 2. Ensure environment credentials exist before executing
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("Missing mail service credentials.");
      return NextResponse.json(
        { error: "Mail service is temporarily unavailable." },
        { status: 503 }
      );
    }

    const trimmedEmail = email.trim();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 3. Cap array items to prevent memory / payload abuse
    const formattedSuggestions = suggestions
      .slice(0, 10)
      .map((s: string, index: number) => `Suggestion #${index + 1}:\n${String(s).trim()}\n`)
      .join("\n-----------------------------------\n\n");

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `🚀 New Website Suggestion from ${trimmedEmail}`,
      text: `Timestamp: ${new Date().toISOString()}\nUser Email: ${trimmedEmail}\n\n${formattedSuggestions}`,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: "Suggestion sent successfully!" });
  } catch (error: any) {
    console.error("Error sending email:", error);
    // 4. Return a generic error message to avoid leaking stack traces or internal mail configs
    return NextResponse.json(
      { error: "Failed to send email. Please try again later." },
      { status: 500 }
    );
  }
}