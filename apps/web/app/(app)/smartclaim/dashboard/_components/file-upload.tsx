// apps/web/app/(app)/smartclaim/dashboard/_components/file-upload.tsx
'use client';

import { useRef } from 'react';
import { Button } from '@kit/ui/button';
import { PaperclipIcon, XIcon } from 'lucide-react';

interface FileUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
}

const ACCEPTED_FILE_TYPES = [
  '.csv',
  '.xlsx',
  '.xls',
  '.pdf',
  '.docx',
  '.doc',
  '.ppt',
  '.pptx',
  '.md',
  '.txt',
];

export function FileUpload({ files, onChange }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      onChange([...files, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onChange(newFiles);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_TYPES.join(',')}
        onChange={handleFileChange}
        className="hidden"
      />
      
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
      >
        <PaperclipIcon className="h-4 w-4 mr-2" />
        Attach Files
      </Button>

      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-secondary rounded-md text-sm"
            >
              <span className="truncate">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}