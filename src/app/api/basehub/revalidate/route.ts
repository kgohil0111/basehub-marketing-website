import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Verify the webhook secret (you should set this in BaseHub and your env)
    const authHeader = request.headers.get("authorization");
    const webhookSecret = process.env.BASEHUB_WEBHOOK_SECRET;

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse the webhook payload
    const body = await request.json();
    console.log("BaseHub webhook received:", body);

    // Revalidate all pages
    revalidatePath("/", "layout");

    // Optionally, revalidate specific paths based on the webhook payload
    // if (body.collection === "pages" && body.document?.pathname) {
    //   revalidatePath(body.document.pathname);
    // }

    return NextResponse.json({
      revalidated: true,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error revalidating:", error);
    return NextResponse.json({ error: "Error revalidating" }, { status: 500 });
  }
}
