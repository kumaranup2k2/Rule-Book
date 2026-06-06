// src/components/dashboard/CSVDropZone.jsx
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from '../ui/Icons';
import { parseCSV } from '../../utils/csvImport';

const MotionDiv = motion.div;

export default function CSVDropZone({ onImport, market }) {
  const [drag, setDrag] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseError, setParseError] = useState('');
  const ref = useRef();

  const handle = (file) => {
    if (!file || !file.name.endsWith('.csv')) {
      setParseError('Please upload a valid .csv file.');
      return;
    }
    setParseError('');
    setIsProcessing(true); // Loading spinner on kar diya

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = parseCSV(e.target.result, market);
        
        // Agar file valid nahi hai ya pairing nahi hui
        if (!parsed || parsed.length === 0) {
          setParseError('No valid trades found in CSV. Check the file format matches your broker export.');
          setIsProcessing(false);
          return;
        }

        // Direct import trigger (Bina Import All button ke)
        const ok = await onImport(parsed, 'journal-dropzone');
        if (ok !== false) {
          setParseError('');
        } else {
          setParseError('Import failed. Check Firebase permissions.');
        }
      } catch (err) {
        console.error('CSV parse error:', err);
        setParseError('Failed to parse CSV. Ensure the file matches the expected broker format.');
      } finally {
        setIsProcessing(false); // Process khatam hone pe loading band
      }
    };
    reader.onerror = () => {
      setParseError('Could not read file. Please try again.');
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  return (
    <AnimatePresence mode="wait">
      <MotionDiv
        key="drop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onDragOver={e => { e.preventDefault(); !isProcessing && setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); !isProcessing && handle(e.dataTransfer.files[0]); }}
        onClick={() => !isProcessing && ref.current?.click()}
        style={{
          border: `1.5px dashed ${parseError ? 'var(--clr-loss)' : drag ? 'var(--accent-indian)' : 'var(--border-strong)'}`,
          borderRadius: 20,
          padding: '28px 20px',
          textAlign: 'center',
          cursor: isProcessing ? 'wait' : 'pointer',
          background: drag ? 'var(--accent-indian-dim)' : parseError ? 'var(--clr-loss-dim)' : 'transparent',
          transition: 'all 0.2s',
        }}
      >
        <input
          ref={ref}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={e => handle(e.target.files[0])}
        />
        
        {isProcessing ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ color: 'var(--accent-indian)', display: 'flex', justifyContent: 'center' }}>
               {/* Aap yahan apna Icons component bhi use kar sakte ho agar spinner hai, warna font-awesome use kiya hai */}
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px' }} />
            </div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700, color: 'var(--txt-primary)' }}>
              Processing & Importing...
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ color: parseError ? 'var(--clr-loss)' : drag ? 'var(--accent-indian)' : 'var(--txt-muted)', display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <Icons.Upload />
            </div>
            <div style={{
              fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700,
              color: parseError ? 'var(--clr-loss)' : drag ? 'var(--accent-indian)' : 'var(--txt-primary)',
            }}>
              {drag ? 'Drop CSV here' : 'Drag & Drop CSV File'}
            </div>
            {parseError ? (
              <div style={{ fontSize: 10, marginTop: 6, color: 'var(--clr-loss)', fontWeight: 700 }}>
                {parseError}
              </div>
            ) : (
              <div style={{ fontSize: 10, marginTop: 6, color: 'var(--txt-muted)', letterSpacing: '0.1em' }}>
                or click to browse &middot; Import starts automatically
              </div>
            )}
          </motion.div>
        )}
      </MotionDiv>
    </AnimatePresence>
  );
}
