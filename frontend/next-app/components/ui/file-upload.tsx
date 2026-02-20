import { UploadDropzone } from "@/lib/uploadthing";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, X, Image as ImageIcon } from "lucide-react";

interface FileUploadProps {
    endpoint: "imageUploader";
    value: string | undefined;
    onChange: (url?: string) => void;
    onRemove?: () => void;
}

export const FileUpload = ({
    endpoint,
    value,
    onChange,
    onRemove
}: FileUploadProps) => {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleRemove = async () => {
        setIsDeleting(true);
        try {
            if (onRemove) {
                onRemove();
            }
            onChange(undefined);
        } catch (error) {
            toast.error("Failed to remove image");
        } finally {
            setIsDeleting(false);
        }
    };

    if (value) {
        return (
            <div className="relative h-40 w-40 rounded-xl overflow-hidden border border-slate-200">
                <img
                    src={value}
                    alt="Upload"
                    className="object-cover w-full h-full"
                />
                <button
                    onClick={handleRemove}
                    className="absolute top-2 right-2 p-1 bg-red-500 rounded-full shadow-sm text-white hover:bg-red-600 transition-colors"
                    type="button"
                    disabled={isDeleting}
                >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                </button>
            </div>
        );
    }

    return (
        <UploadDropzone
            endpoint={endpoint}
            onClientUploadComplete={(res) => {
                onChange(res?.[0].url);
                toast.success("Image uploaded successfully");
            }}
            onUploadError={(error: Error) => {
                toast.error(`Upload failed: ${error.message}`);
            }}
            className="ut-label:text-indigo-600 ut-button:bg-indigo-600 ut-button:ut-readying:bg-indigo-500/50 ut-label:hover:text-indigo-700 ut-button:hover:bg-indigo-700"
            content={{
                label: "Choose or drag image here",
                allowedContent: "Images up to 4MB"
            }}
        />
    );
};
