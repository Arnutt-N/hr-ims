import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "@/auth";

const f = createUploadthing();

export async function requireUploadAuth() {
    const session = await auth();
    if (!session?.user) {
        throw new UploadThingError("Unauthorized");
    }
    return { userId: session.user.id };
}

// FileRouter for your app, can contain multiple "routes"
export const ourFileRouter = {
    // Define as many FileRoutes as you like, each with a unique routeSlug
    imageUploader: f({ image: { maxFileSize: "4MB" } })
        .middleware(requireUploadAuth)
        .onUploadComplete(async ({ file }) => {
            // This code RUNS ON YOUR SERVER after upload
            console.log("Upload complete for url:", file.url);

            // Return metadata to the client if needed
            return { url: file.url };
        }),

    // PRP v6 Q18: maintenance photos — restrict to safe raster MIMEs.
    // SVG explicitly excluded as XSS vector via embedded <script>.
    // Max 5 files x 4MB each (Phase 3 RequestForm enforces count client-side
    // too; Server Action photoUrls.max(5) is the source of truth).
    maintenancePhotoUploader: f({
        "image/jpeg": { maxFileSize: "4MB", maxFileCount: 5 },
        "image/png": { maxFileSize: "4MB", maxFileCount: 5 },
        "image/webp": { maxFileSize: "4MB", maxFileCount: 5 },
    })
        .middleware(requireUploadAuth)
        .onUploadComplete(async ({ file }) => {
            console.log("Maintenance photo uploaded:", file.url);
            return { url: file.url };
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
