import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { userId } = await auth();
    
    return NextResponse.json({
      success: true,
      message: "Debug endpoint working",
      userId: userId || "not authenticated",
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(req.headers.entries())
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
