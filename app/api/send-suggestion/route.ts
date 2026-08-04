import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, suggestions } = body;

    if (!email || !suggestions || !Array.isArray(suggestions)) {
      return NextResponse.json(
        { error: "Invalid data provided." },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const formattedSuggestions = suggestions
      .map((s: string, index: number) => `Suggestion #${index + 1}:\n${s}\n`)
      .join("\n-----------------------------------\n\n");

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `🚀 New Website Suggestion from ${email}`,
      text: `You have received a new suggestion submission:\n\nUser Email: ${email}\n\n${formattedSuggestions}`,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: "Suggestion sent successfully!" });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send email." },
      { status: 500 }
    );
  }
}
