import { useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { Spinner } from './ui.jsx';

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png'];

// Uploads one document into the student's vault. The server checks the file again.
export default function UploadButton({ docType, label, replace = false, onDone }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [picked, setPicked] = useState(null);

  async function onPick(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    // Some phones send an empty type, so fall back to the file name.
    const typeOk = ALLOWED.includes(file.type) || (!file.type && /\.(pdf|jpe?g|png)$/i.test(file.name));
    if (!typeOk) return setError('Upload a PDF, JPG or PNG file.');
    if (file.size === 0) return setError('The file is empty. Choose a different file.');
    if (file.size > MAX_BYTES) return setError('The file is too large. The limit is 2 MB.');

    const form = new FormData();
    form.append('docType', docType);
    form.append('file', file);
    setBusy(true);
    setPicked(file.name);
    try {
      const doc = await api('/documents', { method: 'POST', form });
      onDone?.(doc);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setPicked(null);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <input ref={input} type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={onPick} aria-label={`${replace ? 'Replace' : 'Upload'} ${label}`} tabIndex={-1} />
      <button type="button" className={`btn btn-small ${replace ? 'btn-quiet' : 'btn-primary'}`} disabled={busy} onClick={() => input.current.click()}>
        {busy ? <><Spinner />{isImage(picked) ? 'Reading document…' : 'Uploading…'}</> : <>{replace ? 'Replace' : 'Upload'}</>}
        <span className="sr-only"> {label}</span>
      </button>
      {error && <span role="alert" className="max-w-[14rem] text-right text-sm text-miss">{error}</span>}
    </span>
  );
}

const isImage = (name) => /\.(jpe?g|png)$/i.test(name || '');
