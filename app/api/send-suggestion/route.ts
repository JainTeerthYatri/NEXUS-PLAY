import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { email, suggestions } = await req.json();

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
      .map((s, index) => `Suggestion #${index + 1}:\n${s}\n`)
      .join("\n-----------------------------------\n\n");

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `🚀 New Website Suggestion from ${email}`,
      text: `You have received a new suggestion submission:\n\nUser Email: ${email}\n\n${formattedSuggestions}`,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: "Suggestion sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Failed to send email." },
      { status: 500 }
    );
  }
}
