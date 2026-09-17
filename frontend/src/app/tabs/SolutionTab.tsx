/**
 * SolutionTab — reference solutions per language in Monaco, with the
 * currently-executing line highlighted in sync with playback.
 */

import { useEffect, useRef, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { AlgorithmDefinition, Language } from '../../engine/definition';
import { usePlayback } from '../../stores/playback';

const MONACO_LANG: Record<Language, string> = {
  cpp: 'cpp',
  java: 'java',
  python: 'python',
};

const LANG_LABEL: Record<Language, string> = {
  cpp: 'C++',
  java: 'Java',
  python: 'Python',
};

type EditorInstance = Parameters<OnMount>[0];

export function SolutionTab({ def }: { def: AlgorithmDefinition }) {
  const [lang, setLang] = useState<Language>(def.solutions[0]?.language ?? 'python');
  const line = usePlayback((s) => s.visState?.line ?? null);
  const editorRef = useRef<EditorInstance | null>(null);
  const decorationsRef = useRef<string[]>([]);

  const solution = def.solutions.find((s) => s.language === lang) ?? def.solutions[0];
  const activeLine = line?.[lang] ?? null;

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      activeLine !== null
        ? [
            {
              range: { startLineNumber: activeLine, startColumn: 1, endLineNumber: activeLine, endColumn: 1 },
              options: { isWholeLine: true, className: 'active-line-highlight' },
            },
          ]
        : [],
    );
    if (activeLine !== null) editor.revealLineInCenterIfOutsideViewport(activeLine);
  }, [activeLine, lang]);

  if (!solution) {
    return <p className="text-sm text-ink-muted">No reference solutions yet.</p>;
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex gap-1">
        {def.solutions.map((s) => (
          <button
            key={s.language}
            onClick={() => setLang(s.language)}
            className={`rounded-md px-3 py-1 text-xs transition-colors ${
              lang === s.language ? 'bg-accent text-surface-0 font-medium' : 'bg-surface-2 text-ink-muted hover:bg-surface-3'
            }`}
          >
            {LANG_LABEL[s.language]}
          </button>
        ))}
      </div>
      <div className="min-h-[300px] flex-1 overflow-hidden rounded-lg border border-surface-3">
        <Editor
          language={MONACO_LANG[solution.language]}
          value={solution.code}
          theme="vs-dark"
          onMount={(editor) => {
            editorRef.current = editor;
          }}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            scrollBeyondLastLine: false,
            renderLineHighlight: 'none',
            lineNumbersMinChars: 3,
          }}
        />
      </div>
    </div>
  );
}
