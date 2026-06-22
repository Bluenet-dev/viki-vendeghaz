import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

// Kliens-oldali Vercel Blob feltöltés token-végpontja. A böngésző közvetlenül a
// Blob tárolóba tölt fel (megkerülve a szerver action / serverless body-limitet),
// ez a route csak a feltöltési tokent állítja ki – kizárólag bejelentkezett adminnak.
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await getSession();
        if (!session.isLoggedIn) {
          throw new Error("Nincs jogosultság a feltöltéshez.");
        }
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/avif",
            "image/gif",
          ],
          addRandomSuffix: true,
          maximumSizeInBytes: 15 * 1024 * 1024, // 15 MB
        };
      },
      // A DB-sor beszúrása a kliensről, a saveUploadedImage server actionnel
      // történik (ez a callback localhoston nem hívódik meg) – itt nincs teendő.
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Feltöltési hiba" },
      { status: 400 },
    );
  }
}
