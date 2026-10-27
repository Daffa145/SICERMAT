import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "CERMAT",
    version: "1.0.0",
    time: new Date().toISOString(),
  });
}
