import { useRef, useState, DragEvent } from 'react';

interface Props {
  label: string;
  accept: string;
  onFile: (file: File) => void;
  fileName?: string | null;
  multiple?: boolean;
  onFiles?: (files: File[]) => void;
}

export default function UploadZone({ label, accept, onFile, fileName, multiple, onFiles }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    if (multiple && onFiles) {
      onFiles(files);
    } else if (files[0]) {
      onFile(files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (multiple && onFiles) {
      onFiles(files);
    } else if (files[0]) {
      onFile(files[0]);
    }
  };

  return (
    <div
      className={`upload-zone ${dragging ? 'dragover' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
      />
      <div className="upload-zone-icon">📄</div>
      <div style={{ fontWeight: 600, fontSize: 15 }}>{label}</div>
      <div className="upload-zone-label">Klik om te uploaden of sleep hier naartoe</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>PDF of afbeelding (JPG, PNG)</div>
      {fileName && (
        <div className="file-badge" style={{ marginTop: 10 }}>
          ✓ {fileName}
        </div>
      )}
    </div>
  );
}
