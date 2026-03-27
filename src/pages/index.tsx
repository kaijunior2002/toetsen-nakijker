import { useState, useRef, useCallback } from 'react';
import Head from 'next/head';
import StepIndicator from '../components/StepIndicator';
import UploadZone from '../components/UploadZone';
import { Question, StudentPage, Student, StudentResult, GradedQuestion, Confidence } from '../lib/types';
import { fileToBase64, getMediaType, generateId } from '../lib/fileUtils';

// ==================== STEP 1 ====================
function Step1({
  onNext,
}: {
  onNext: (data: {
    examData: string; examType: string; examName: string;
    answerKeyData: string; answerKeyType: string; answerKeyName: string;
    questions: Question[];
  }) => void;
}) {
  const [examFile, setExamFile] = useState<{ data: string; type: string; name: string } | null>(null);
  const [answerKeyFile, setAnswerKeyFile] = useState<{ data: string; type: string; name: string } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState(false);

  const handleExamFile = async (file: File) => {
    const data = await fileToBase64(file);
    setExamFile({ data, type: getMediaType(file.name), name: file.name });
    setExtracted(false);
    setQuestions([]);
  };

  const handleAnswerKey = async (file: File) => {
    const data = await fileToBase64(file);
    setAnswerKeyFile({ data, type: getMediaType(file.name), name: file.name });
    setExtracted(false);
    setQuestions([]);
  };

  const extractQuestions = async () => {
    if (!examFile || !answerKeyFile) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/extract-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examData: examFile.data,
          examType: examFile.type,
          answerKeyData: answerKeyFile.data,
          answerKeyType: answerKeyFile.type,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Fout bij analyseren');
      setQuestions(json.questions);
      setExtracted(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const updateQuestion = (i: number, field: keyof Question, value: any) => {
    setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: value } : q));
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, {
      question_number: String(prev.length + 1),
      question_text: '',
      max_points: 1,
      is_multiple_choice: false,
    }]);
  };

  const removeQuestion = (i: number) => {
    setQuestions(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleNext = () => {
    if (!examFile || !answerKeyFile || questions.length === 0) return;
    onNext({
      examData: examFile.data,
      examType: examFile.type,
      examName: examFile.name,
      answerKeyData: answerKeyFile.data,
      answerKeyType: answerKeyFile.type,
      answerKeyName: answerKeyFile.name,
      questions,
    });
  };

  return (
    <div>
      <div className="page-title">Toets uploaden</div>
      <div className="page-subtitle">Upload de toets en het correctiemodel. De AI analyseert ze en extraheert de vragen.</div>

      <div className="card">
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>📝 Toetsblad</div>
            <UploadZone
              label="Toetsblad uploaden"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onFile={handleExamFile}
              fileName={examFile?.name}
            />
          </div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>🔑 Correctiemodel</div>
            <UploadZone
              label="Correctiemodel uploaden"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onFile={handleAnswerKey}
              fileName={answerKeyFile?.name}
            />
          </div>
        </div>

        {error && (
          <div className="alert alert-warning" style={{ marginTop: 16 }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
          <button
            className="btn btn-primary"
            disabled={!examFile || !answerKeyFile || loading}
            onClick={extractQuestions}
          >
            {loading ? <><span className="spinner" /> Analyseren...</> : '🔍 Vragen extraheren'}
          </button>
        </div>
      </div>

      {extracted && questions.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Gevonden vragen</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Controleer en corrigeer indien nodig</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={addQuestion}>+ Vraag toevoegen</button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Nr</th>
                  <th>Vraag</th>
                  <th>Punten</th>
                  <th>MC?</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q, i) => (
                  <tr key={i}>
                    <td style={{ width: 60 }}>
                      <input
                        type="text"
                        value={q.question_number}
                        onChange={e => updateQuestion(i, 'question_number', e.target.value)}
                        style={{ width: 50 }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={q.question_text}
                        onChange={e => updateQuestion(i, 'question_text', e.target.value)}
                      />
                    </td>
                    <td style={{ width: 80 }}>
                      <input
                        type="number"
                        value={q.max_points}
                        min={0}
                        onChange={e => updateQuestion(i, 'max_points', Number(e.target.value))}
                        style={{ width: 60 }}
                      />
                    </td>
                    <td style={{ width: 60, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={q.is_multiple_choice}
                        onChange={e => updateQuestion(i, 'is_multiple_choice', e.target.checked)}
                      />
                    </td>
                    <td style={{ width: 40 }}>
                      <button
                        onClick={() => removeQuestion(i)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', fontSize: 16 }}
                      >×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Totaal: {questions.reduce((s, q) => s + q.max_points, 0)} punten · {questions.length} vragen
            </div>
            <button className="btn btn-primary" onClick={handleNext}>
              Volgende stap →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== STEP 2 ====================
function Step2({
  onNext,
  onBack,
}: {
  onNext: (data: { pages: StudentPage[]; students: Student[] }) => void;
  onBack: () => void;
}) {
  const [pages, setPages] = useState<StudentPage[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: File[]) => {
    setProcessing(true);
    setError(null);
    setProcessedCount(0);
    
    const newPages: StudentPage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const dataUrl = await fileToBase64(file);
        const mediaType = getMediaType(file.name);
        const id = generateId();

        // Detect name via API (only for images, not PDF for now)
        let detectedName: string | null = null;
        if (!file.name.toLowerCase().endsWith('.pdf')) {
          try {
            const res = await fetch('/api/detect-name', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageData: dataUrl, mediaType }),
            });
            const json = await res.json();
            detectedName = json.name || null;
          } catch {}
        }

        newPages.push({
          id,
          dataUrl,
          fileName: file.name,
          detectedName,
          assignedStudentId: null,
        });
        setProcessedCount(i + 1);
      } catch (e) {
        console.error('Error processing file', file.name, e);
      }
    }

    // Auto-group: pages with name = new student, pages without = group with previous
    const updatedPages = [...newPages];
    const newStudents: Student[] = [...students];
    let lastStudentId: string | null = null;

    for (const page of updatedPages) {
      if (page.detectedName) {
        // Check if student already exists
        const existing = newStudents.find(s => 
          s.name.toLowerCase().trim() === page.detectedName!.toLowerCase().trim()
        );
        if (existing) {
          page.assignedStudentId = existing.id;
          lastStudentId = existing.id;
        } else {
          const newStudent: Student = {
            id: generateId(),
            name: page.detectedName,
            pageIds: [],
          };
          newStudents.push(newStudent);
          page.assignedStudentId = newStudent.id;
          lastStudentId = newStudent.id;
        }
      } else {
        // No name: attach to last student
        if (lastStudentId) {
          page.assignedStudentId = lastStudentId;
        } else {
          // No previous student — create unknown
          const unknownStudent: Student = {
            id: generateId(),
            name: 'Onbekende leerling',
            pageIds: [],
          };
          newStudents.push(unknownStudent);
          page.assignedStudentId = unknownStudent.id;
          lastStudentId = unknownStudent.id;
        }
      }
    }

    // Update student pageIds
    for (const student of newStudents) {
      student.pageIds = updatedPages
        .filter(p => p.assignedStudentId === student.id)
        .map(p => p.id);
    }

    setPages(prev => [...prev, ...updatedPages]);
    setStudents(newStudents);
    setProcessing(false);
  };

  const updateStudentName = (studentId: string, name: string) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, name } : s));
  };

  const reassignPage = (pageId: string, studentId: string) => {
    setPages(prev => prev.map(p => p.id === pageId ? { ...p, assignedStudentId: studentId } : p));
    // Update student pageIds
    setStudents(prev => prev.map(s => ({
      ...s,
      pageIds: s.id === studentId
        ? [...s.pageIds.filter(id => id !== pageId), pageId]
        : s.pageIds.filter(id => id !== pageId),
    })));
  };

  const removeStudent = (studentId: string) => {
    setStudents(prev => prev.filter(s => s.id !== studentId));
    setPages(prev => prev.map(p => p.assignedStudentId === studentId ? { ...p, assignedStudentId: null } : p));
  };

  const handleNext = () => {
    const validStudents = students.filter(s => s.pageIds.length > 0);
    onNext({ pages, students: validStudents });
  };

  return (
    <div>
      <div className="page-title">Leerlingtoetsen uploaden</div>
      <div className="page-subtitle">Upload de toetsen van alle leerlingen. De AI herkent automatisch de namen en groepeert de pagina's.</div>

      <div className="card">
        <UploadZone
          label="Leerlingtoetsen uploaden"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onFile={() => {}}
          multiple
          onFiles={handleFiles}
        />
        {processing && (
          <div className="alert alert-info" style={{ marginTop: 12 }}>
            ⏳ Verwerken... ({processedCount} pagina&apos;s verwerkt)
          </div>
        )}
        {error && <div className="alert alert-warning" style={{ marginTop: 12 }}>⚠️ {error}</div>}
      </div>

      {students.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Leerlingen ({students.length})</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>Controleer namen en paginatoewijzingen</div>

          {students.map(student => {
            const studentPages = pages.filter(p => p.assignedStudentId === student.id);
            return (
              <div key={student.id} style={{ marginBottom: 16, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="text"
                    value={student.name}
                    onChange={e => updateStudentName(student.id, e.target.value)}
                    style={{ flex: 1, fontWeight: 600, fontSize: 15 }}
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{studentPages.length} pagina{studentPages.length !== 1 ? "'s" : ""}</span>
                  <button
                    onClick={() => removeStudent(student.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', fontSize: 18, padding: '0 4px' }}
                    title="Leerling verwijderen"
                  >×</button>
                </div>
                <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {studentPages.map(page => (
                    <div key={page.id} style={{ textAlign: 'center' }}>
                      {!page.fileName.toLowerCase().endsWith('.pdf') ? (
                        <img src={page.dataUrl} alt={page.fileName} className="thumbnail-img" />
                      ) : (
                        <div className="student-thumb">📄</div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {page.fileName}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <button className="btn btn-secondary" onClick={onBack}>← Terug</button>
        <button
          className="btn btn-primary"
          disabled={students.length === 0 || processing}
          onClick={handleNext}
        >
          Nakijken starten →
        </button>
      </div>
    </div>
  );
}

// ==================== STEP 3 ====================
function Step3({
  students,
  pages,
  questions,
  answerKeyData,
  answerKeyType,
  onDone,
  onBack,
}: {
  students: Student[];
  pages: StudentPage[];
  questions: Question[];
  answerKeyData: string;
  answerKeyType: string;
  onDone: (results: StudentResult[]) => void;
  onBack: () => void;
}) {
  const [results, setResults] = useState<StudentResult[]>(
    students.map(s => ({
      studentId: s.id,
      studentName: s.name,
      grades: [],
      totalPoints: 0,
      maxPoints: questions.reduce((acc, q) => acc + q.max_points, 0),
      status: 'pending' as const,
    }))
  );
  const [started, setStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [done, setDone] = useState(false);

  const startGrading = async () => {
    setStarted(true);
    const updatedResults = [...results];

    for (let i = 0; i < students.length; i++) {
      setCurrentIdx(i);
      const student = students[i];
      const studentPages = pages.filter(p => student.pageIds.includes(p.id));

      updatedResults[i] = { ...updatedResults[i], status: 'grading' };
      setResults([...updatedResults]);

      try {
        const res = await fetch('/api/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentName: student.name,
            pages: studentPages.map(p => ({ dataUrl: p.dataUrl, mediaType: getMediaType(p.fileName) })),
            questions,
            answerKeyData,
            answerKeyType,
          }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Fout bij nakijken');

        const grades: GradedQuestion[] = json.grades;
        const totalPoints = grades.reduce((acc, g) => acc + g.points_awarded, 0);

        updatedResults[i] = {
          ...updatedResults[i],
          grades,
          totalPoints,
          status: 'done',
        };
      } catch (e: any) {
        updatedResults[i] = {
          ...updatedResults[i],
          status: 'error',
          error: e.message,
        };
      }

      setResults([...updatedResults]);
    }

    setDone(true);
  };

  const progress = results.filter(r => r.status === 'done' || r.status === 'error').length;
  const progressPct = students.length > 0 ? (progress / students.length) * 100 : 0;

  return (
    <div>
      <div className="page-title">Toetsen nakijken</div>
      <div className="page-subtitle">De AI kijkt de toetsen na. Dit kan even duren.</div>

      <div className="card">
        {!started ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
            <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 8 }}>Klaar om te starten</div>
            <div style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
              {students.length} leerling{students.length !== 1 ? 'en' : ''} · {questions.length} vragen per toets
            </div>
            <button className="btn btn-primary" onClick={startGrading} style={{ fontSize: 16, padding: '12px 28px' }}>
              🚀 Nakijken starten
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 600 }}>Voortgang</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{progress} / {students.length}</div>
            </div>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
            </div>

            <div style={{ marginTop: 16 }}>
              {results.map((result, i) => (
                <div key={result.studentId} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                  borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ width: 24, textAlign: 'center' }}>
                    {result.status === 'pending' && <span style={{ color: 'var(--text-muted)' }}>⏳</span>}
                    {result.status === 'grading' && <span className="spinner" style={{ border: '3px solid var(--border)', borderTopColor: 'var(--primary)', width: 16, height: 16 }} />}
                    {result.status === 'done' && <span>✅</span>}
                    {result.status === 'error' && <span>❌</span>}
                  </div>
                  <div style={{ flex: 1, fontWeight: result.status === 'grading' ? 600 : 400 }}>
                    {result.studentName}
                  </div>
                  {result.status === 'done' && (
                    <div style={{ color: 'var(--primary)', fontWeight: 600 }}>
                      {result.totalPoints}/{result.maxPoints}
                    </div>
                  )}
                  {result.status === 'error' && (
                    <div style={{ color: 'var(--error)', fontSize: 13 }}>{result.error}</div>
                  )}
                  {result.status === 'grading' && (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Bezig...</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <button className="btn btn-secondary" onClick={onBack} disabled={started && !done}>← Terug</button>
        {done && (
          <button className="btn btn-primary" onClick={() => onDone(results)}>
            Resultaten bekijken →
          </button>
        )}
      </div>
    </div>
  );
}

// ==================== STEP 4 ====================
function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  if (confidence === 'zeker') return <span className="badge badge-zeker">✓ Zeker</span>;
  if (confidence === 'twijfel') return <span className="badge badge-twijfel">🟡 Twijfel</span>;
  return <span className="badge badge-kan_niet">🔴 Kan niet beoordelen</span>;
}

function Step4({
  results,
  pages,
  questions,
  onBack,
  onReset,
}: {
  results: StudentResult[];
  pages: StudentPage[];
  questions: Question[];
  onBack: () => void;
  onReset: () => void;
}) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [editedResults, setEditedResults] = useState<StudentResult[]>(results);

  const selectedResult = editedResults.find(r => r.studentId === selectedStudentId);

  const updatePoints = (studentId: string, questionNumber: string, points: number) => {
    setEditedResults(prev => prev.map(r => {
      if (r.studentId !== studentId) return r;
      const newGrades = r.grades.map(g =>
        g.question_number === questionNumber ? { ...g, points_awarded: points } : g
      );
      const totalPoints = newGrades.reduce((acc, g) => acc + g.points_awarded, 0);
      return { ...r, grades: newGrades, totalPoints };
    }));
  };

  const exportCSV = () => {
    const rows: string[][] = [
      ['Leerling', 'Totaal', 'Max', 'Twijfel', 'Kan niet beoordelen',
       ...questions.map(q => `Vraag ${q.question_number} (${q.max_points}pt)`)],
    ];
    for (const result of editedResults) {
      const twijfel = result.grades.filter(g => g.confidence === 'twijfel').length;
      const kanNiet = result.grades.filter(g => g.confidence === 'kan_niet_beoordelen').length;
      rows.push([
        result.studentName,
        String(result.totalPoints),
        String(result.maxPoints),
        String(twijfel),
        String(kanNiet),
        ...questions.map(q => {
          const grade = result.grades.find(g => g.question_number === q.question_number);
          return grade ? String(grade.points_awarded) : '-';
        }),
      ]);
    }
    const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'toetsen-resultaten.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (selectedResult) {
    const studentPages = pages.filter(p => {
      // Find pages belonging to this student
      return editedResults.find(r => r.studentId === selectedResult.studentId) !== undefined;
    });
    // Actually we need the student object - but let's just show all pages that belong
    // We'll skip page images in detail view for simplicity since we don't pass students here
    
    return (
      <div>
        <button className="back-btn" onClick={() => setSelectedStudentId(null)}>
          ← Terug naar overzicht
        </button>
        <div className="page-title">{selectedResult.studentName}</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>
            {selectedResult.totalPoints} / {selectedResult.maxPoints} punten
          </div>
        </div>

        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Vraag</th>
                <th>Punten</th>
                <th>Max</th>
                <th>Beoordeling</th>
                <th>Uitleg</th>
              </tr>
            </thead>
            <tbody>
              {selectedResult.grades.map((grade, i) => {
                const question = questions.find(q => q.question_number === grade.question_number);
                return (
                  <tr key={i}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{grade.question_number}</div>
                      {question && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{question.question_text.slice(0, 60)}{question.question_text.length > 60 ? '...' : ''}</div>}
                    </td>
                    <td style={{ width: 80 }}>
                      <input
                        type="number"
                        value={grade.points_awarded}
                        min={0}
                        max={grade.max_points}
                        onChange={e => updatePoints(selectedResult.studentId, grade.question_number, Number(e.target.value))}
                        style={{ width: 60 }}
                      />
                    </td>
                    <td style={{ width: 60, color: 'var(--text-muted)' }}>{grade.max_points}</td>
                    <td style={{ width: 160 }}>
                      <ConfidenceBadge confidence={grade.confidence} />
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 200 }}>
                      {grade.confidence !== 'zeker' && !question?.is_multiple_choice ? grade.explanation : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const sorted = [...editedResults].sort((a, b) => b.totalPoints - a.totalPoints);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div className="page-title">Resultaten</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}>📥 Exporteer CSV</button>
          <button className="btn btn-secondary btn-sm" onClick={onReset}>🔄 Nieuwe sessie</button>
        </div>
      </div>
      <div className="page-subtitle">{editedResults.length} leerling{editedResults.length !== 1 ? 'en' : ''} · Klik op een leerling voor details</div>

      <div className="card" style={{ padding: '8px 0' }}>
        {/* Header row */}
        <div style={{ display: 'flex', gap: 12, padding: '8px 16px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>
          <div style={{ flex: 1 }}>Leerling</div>
          <div style={{ width: 80, textAlign: 'right' }}>Punten</div>
          <div style={{ width: 60, textAlign: 'center' }}>🟡</div>
          <div style={{ width: 60, textAlign: 'center' }}>🔴</div>
        </div>

        {sorted.map(result => {
          const twijfel = result.grades.filter(g => g.confidence === 'twijfel').length;
          const kanNiet = result.grades.filter(g => g.confidence === 'kan_niet_beoordelen').length;
          return (
            <div
              key={result.studentId}
              className="result-row"
              onClick={() => result.status === 'done' ? setSelectedStudentId(result.studentId) : null}
              style={{ borderRadius: 0, border: 'none', borderBottom: '1px solid var(--border)', cursor: result.status === 'done' ? 'pointer' : 'default' }}
            >
              <div className="result-name">{result.studentName}</div>
              <div style={{ width: 80, textAlign: 'right' }}>
                {result.status === 'done' ? (
                  <span className="result-score" style={{ fontSize: 16 }}>
                    {result.totalPoints}/{result.maxPoints}
                  </span>
                ) : (
                  <span style={{ color: 'var(--error)', fontSize: 13 }}>Fout</span>
                )}
              </div>
              <div style={{ width: 60, textAlign: 'center', color: twijfel > 0 ? '#854d0e' : 'var(--text-muted)' }}>
                {twijfel > 0 ? twijfel : '–'}
              </div>
              <div style={{ width: 60, textAlign: 'center', color: kanNiet > 0 ? 'var(--error)' : 'var(--text-muted)' }}>
                {kanNiet > 0 ? kanNiet : '–'}
              </div>
            </div>
          );
        })}
      </div>

      {editedResults.some(r => r.grades.some(g => g.confidence === 'twijfel' || g.confidence === 'kan_niet_beoordelen')) && (
        <div className="alert alert-warning">
          ⚠️ Er zijn vragen met <strong>twijfel</strong> of <strong>kan niet beoordelen</strong>. Klik op een leerling om die vragen handmatig te beoordelen.
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <button className="btn btn-secondary" onClick={onBack}>← Terug naar nakijken</button>
      </div>
    </div>
  );
}

// ==================== MAIN ====================
export default function Home() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [examData, setExamData] = useState<string>('');
  const [examType, setExamType] = useState<string>('');
  const [answerKeyData, setAnswerKeyData] = useState<string>('');
  const [answerKeyType, setAnswerKeyType] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [pages, setPages] = useState<StudentPage[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<StudentResult[]>([]);

  const reset = () => {
    setStep(1);
    setExamData('');
    setExamType('');
    setAnswerKeyData('');
    setAnswerKeyType('');
    setQuestions([]);
    setPages([]);
    setStudents([]);
    setResults([]);
  };

  return (
    <>
      <Head>
        <title>Toetsen Nakijker</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="header">
        <div className="header-inner">
          <a className="header-logo" href="#" onClick={e => { e.preventDefault(); reset(); }}>
            🎓 Toetsen Nakijker
            <span>AI nakijkassistent</span>
          </a>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <StepIndicator currentStep={step} totalSteps={4} />

          {step === 1 && (
            <Step1
              onNext={data => {
                setExamData(data.examData);
                setExamType(data.examType);
                setAnswerKeyData(data.answerKeyData);
                setAnswerKeyType(data.answerKeyType);
                setQuestions(data.questions);
                setStep(2);
              }}
            />
          )}

          {step === 2 && (
            <Step2
              onNext={data => {
                setPages(data.pages);
                setStudents(data.students);
                setStep(3);
              }}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <Step3
              students={students}
              pages={pages}
              questions={questions}
              answerKeyData={answerKeyData}
              answerKeyType={answerKeyType}
              onDone={res => {
                setResults(res);
                setStep(4);
              }}
              onBack={() => setStep(2)}
            />
          )}

          {step === 4 && (
            <Step4
              results={results}
              pages={pages}
              questions={questions}
              onBack={() => setStep(3)}
              onReset={reset}
            />
          )}
        </div>
      </main>
    </>
  );
}
