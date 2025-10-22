import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// This endpoint provides instructions for client-side scraping
export async function POST(req) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { hostelType, messType, dayNumber } = body;

    // Return instructions for client-side scraping
    return NextResponse.json({
      success: true,
      instructions: {
        method: "client-side-scraping",
        url: "https://messit.vinnovateit.com/details",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        selectors: {
          mealSections: "section.grid > div, .meal-section",
          title: "h2, h3, .meal-title",
          items: "p, .meal-items"
        },
        hostelType,
        messType,
        dayNumber: dayNumber || new Date().getDate()
      },
      fallback: {
        message: "If client-side scraping fails, use sample data",
        sampleData: true
      }
    });

  } catch (error) {
    console.error("Client scrape API error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to prepare client scraping instructions"
    }, { status: 500 });
  }
}
