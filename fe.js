import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Plane,
  Users,
  ListChecks,
  BarChart3,
  Sparkles,
  Plus,
  Trash2,
  FileText,
  History,
  ShieldCheck,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const defaultParticipants = ["Anna", "Max", "Lina"];
const defaultCriteria = [
  { name: "Preis", weight: 30 },
  { name: "Wetter", weight: 25 },
  { name: "Aktivitäten", weight: 25 },
  { name: "Reiseaufwand", weight: 20 },
];
const defaultAlternatives = ["Barcelona", "Rom", "Athen"];

function normalizeWeights(criteria) {
  const total = criteria.reduce((sum, c) => sum + Number(c.weight || 0), 0);
  if (total === 0) {
    return criteria.map((c) => ({
      ...c,
      normalizedWeight: 0,
    }));
  }

  return criteria.map((c) => ({
    ...c,
    normalizedWeight: (Number(c.weight || 0) / total) * 100,
  }));
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function calculateEntropy(values) {
  if (!values.length) return 0;
  const sum = values.reduce((acc, v) => acc + v, 0);
  if (sum <= 0) return 0;

  let entropy = 0;
  values.forEach((v) => {
    const p = v / sum;
    if (p > 0) {
      entropy -= p * Math.log(p);
    }
  });

  return Number(entropy.toFixed(3));
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

export default function DSPTravelDecisionApp() {
  const [participants, setParticipants] = useState(defaultParticipants);
  const [criteria, setCriteria] = useState(defaultCriteria);
  const [alternatives, setAlternatives] = useState(defaultAlternatives);
  const [newParticipant, setNewParticipant] = useState("");
  const [newCriterion, setNewCriterion] = useState("");
  const [newAlternative, setNewAlternative] = useState("");
  const [step, setStep] = useState(0);
  const [decisionHistory, setDecisionHistory] = useState([]);
  const [auditTrail, setAuditTrail] = useState([]);
  const [lastExportType, setLastExportType] = useState("PDF");

  const [ratings, setRatings] = useState(() => {
    const map = {};
    defaultParticipants.forEach((p, pIdx) => {
      defaultAlternatives.forEach((a, aIdx) => {
        defaultCriteria.forEach((c, cIdx) => {
          const key = `${p}__${a}__${c.name}`;
          map[key] = 3 + ((pIdx + aIdx + cIdx) % 3);
        });
      });
    });
    return map;
  });

  const criteriaWithWeights = useMemo(() => normalizeWeights(criteria), [criteria]);

  function logAudit(action, details) {
    setAuditTrail((prev) => [
      {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        action,
        details,
      },
      ...prev,
    ]);
  }

  const completion = useMemo(() => {
    const expected = participants.length * alternatives.length * criteria.length;
    if (expected === 0) return 0;

    const relevantKeys = participants.flatMap((p) =>
      alternatives.flatMap((a) => criteria.map((c) => `${p}__${a}__${c.name}`))
    );

    const filled = relevantKeys.filter((key) => typeof ratings[key] === "number").length;
    return Math.round((filled / expected) * 100);
  }, [participants, alternatives, criteria, ratings]);

  const results = useMemo(() => {
    const rawResults = alternatives.map((alternative) => {
      let totalScore = 0;

      const byParticipant = participants.map((participant) => {
        let participantScore = 0;

        criteriaWithWeights.forEach((criterion) => {
          const key = `${participant}__${alternative}__${criterion.name}`;
          const value = Number(ratings[key] ?? 0);
          participantScore += value * (criterion.normalizedWeight / 100);
        });

        totalScore += participantScore;

        return {
          participant,
          score: Number(participantScore.toFixed(2)),
        };
      });

      const avgScore = participants.length ? totalScore / participants.length : 0;
      const minScore = byParticipant.length ? Math.min(...byParticipant.map((x) => x.score)) : 0;
      const maxScore = byParticipant.length ? Math.max(...byParticipant.map((x) => x.score)) : 0;
      const disagreement = Number((maxScore - minScore).toFixed(2));
      const commitment = maxScore === 0 ? 0 : Math.round((minScore / maxScore) * 100);
      const entropy = calculateEntropy(byParticipant.map((x) => x.score));
      const acceptabilityRaw = Number((avgScore * (1 / (1 + disagreement + entropy))).toFixed(3));

      return {
        alternative,
        avgScore: Number(avgScore.toFixed(2)),
        disagreement,
        commitment,
        entropy,
        acceptabilityRaw,
        acceptabilityNormalized: 0,
        byParticipant,
      };
    });

    const totalAcceptability = rawResults.reduce((sum, r) => sum + r.acceptabilityRaw, 0);

    const normalizedResults = rawResults.map((r) => ({
      ...r,
      acceptabilityNormalized:
        totalAcceptability > 0 ? Number((r.acceptabilityRaw / totalAcceptability).toFixed(3)) : 0,
    }));

    return normalizedResults.sort((a, b) => {
      if (b.acceptabilityNormalized !== a.acceptabilityNormalized) {
        return b.acceptabilityNormalized - a.acceptabilityNormalized;
      }
      return a.disagreement - b.disagreement;
    });
  }, [alternatives, participants, criteriaWithWeights, ratings]);

  const topChoice = results[0];

  useEffect(() => {
    if (!topChoice) return;

    setDecisionHistory((prev) => {
      const latest = prev[0];
      if (
        latest &&
        latest.alternative === topChoice.alternative &&
        latest.acceptabilityNormalized === topChoice.acceptabilityNormalized &&
        latest.avgScore === topChoice.avgScore
      ) {
        return prev;
      }

      return [
        {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          alternative: topChoice.alternative,
          avgScore: topChoice.avgScore,
          commitment: topChoice.commitment,
          disagreement: topChoice.disagreement,
          entropy: topChoice.entropy,
          acceptabilityNormalized: topChoice.acceptabilityNormalized,
        },
        ...prev,
      ].slice(0, 50);
    });
  }, [topChoice]);

  const insights = useMemo(() => {
    if (!topChoice) return [];

    const lines = [];
    lines.push(`Beste Alternative: ${topChoice.alternative}`);
    lines.push(`Durchschnittliche Gruppenbewertung: ${topChoice.avgScore.toFixed(2)} von 5`);
    lines.push(`Commitment-Wert: ${topChoice.commitment}%`);
    lines.push(`Entropie: ${topChoice.entropy}`);
    lines.push(`Acceptability Index: ${topChoice.acceptabilityNormalized}`);
    lines.push(
      topChoice.disagreement <= 1
        ? "Die Gruppe ist bei dieser Option relativ einig."
        : "Bei dieser Option gibt es noch spürbare Meinungsunterschiede."
    );

    return lines;
  }, [topChoice]);

  const consensusSteps = useMemo(() => {
    if (!participants.length || !criteria.length || !alternatives.length || !topChoice) {
      return [];
    }

    let currentEntropy = topChoice.entropy;
    const steps = [];

    criteria.forEach((criterion) => {
      const participantAverages = participants
        .map((participant) => {
          const values = alternatives.map((alternative) => {
            const key = `${participant}__${alternative}__${criterion.name}`;
            return Number(ratings[key] ?? 0);
          });

          const average = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;

          return {
            participant,
            value: average,
          };
        })
        .sort((a, b) => a.value - b.value);

      const spread =
        participantAverages.length > 1
          ? participantAverages[participantAverages.length - 1].value - participantAverages[0].value
          : 0;

      if (spread >= 0.5 && steps.length < 3) {
        const low = participantAverages[0];
        const high = participantAverages[participantAverages.length - 1];
        const newEntropy = Math.max(0, Number((currentEntropy - spread * 0.08).toFixed(3)));

        steps.push(
          `Schritt ${steps.length + 1}: Höchster Konflikt beim Kriterium "${criterion.name}". ${high.participant} und ${low.participant} sollten ihre Einschätzungen gemeinsam besprechen. Konfliktspanne = ${spread.toFixed(
            2
          )}, potenzielle Entropie = ${newEntropy}.`
        );

        currentEntropy = newEntropy;
      }
    });

    if (steps.length === 0) {
      steps.push(
        "Die Gruppe zeigt bereits eine relativ hohe Übereinstimmung. Es sind aktuell keine zusätzlichen Konsensschritte notwendig."
      );
    } else {
      steps.push(`Geschätzte finale Entropie nach den vorgeschlagenen Schritten: ${currentEntropy}.`);
    }

    return steps;
  }, [participants, criteria, alternatives, ratings, topChoice]);

  const chartData = useMemo(
    () =>
      results.map((r, index) => ({
        name: r.alternative,
        score: r.avgScore,
        acceptability: r.acceptabilityNormalized,
        rank: index + 1,
      })),
    [results]
  );

  const exportPayload = useMemo(
    () => ({
      metadata: {
        app: "DSP Travel Decision Assistant",
        exportedAt: new Date().toISOString(),
        completion,
        lastExportType,
      },
      participants,
      criteria: criteriaWithWeights,
      alternatives,
      ratings,
      results,
      topChoice,
      insights,
      consensusSteps,
      decisionHistory,
      auditTrail,
    }),
    [
      completion,
      participants,
      criteriaWithWeights,
      alternatives,
      ratings,
      results,
      topChoice,
      insights,
      consensusSteps,
      decisionHistory,
      auditTrail,
      lastExportType,
    ]
  );

    function exportAsPDF() {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 18;

      doc.setFontSize(18);
      doc.text("Travel Decision Report", 14, y);
      y += 10;

      doc.setFontSize(11);
      doc.text(`Exportzeit: ${formatTimestamp()}`, 14, y);
      y += 7;
      doc.text(`Projektfortschritt: ${completion}%`, 14, y);
      y += 7;
      doc.text(`Empfohlene Reise: ${topChoice?.alternative || "-"}`, 14, y);
      y += 10;

      doc.setFontSize(14);
      doc.text("Ergebnisse", 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [["Rang", "Alternative", "Gruppenscore", "Commitment", "Entropie", "Acceptability"]],
        body: results.map((r, idx) => [
          String(idx + 1),
          r.alternative,
          r.avgScore.toFixed(2),
          `${r.commitment}%`,
          String(r.entropy),
          String(r.acceptabilityNormalized),
        ]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 14, right: 14 },
      });

      y = doc.lastAutoTable.finalY + 10;

      doc.setFontSize(14);
      doc.text("Erklärbare Entscheidung", 14, y);
      y += 8;
      doc.setFontSize(10);

      insights.forEach((line) => {
        const wrapped = doc.splitTextToSize(`- ${line}`, pageWidth - 28);
        doc.text(wrapped, 14, y);
        y += wrapped.length * 5;
      });

      y += 4;
      if (y > 250) {
        doc.addPage();
        y = 18;
      }

      doc.setFontSize(14);
      doc.text("Consensus Steps", 14, y);
      y += 8;
      doc.setFontSize(10);

      consensusSteps.forEach((line) => {
        const wrapped = doc.splitTextToSize(`- ${line}`, pageWidth - 28);
        if (y + wrapped.length * 5 > 280) {
          doc.addPage();
          y = 18;
        }
        doc.text(wrapped, 14, y);
        y += wrapped.length * 5;
      });

      y += 4;
      if (y > 250) {
        doc.addPage();
        y = 18;
      }

      doc.setFontSize(14);
      doc.text("Decision History", 14, y);
      y += 8;
      doc.setFontSize(10);

      const historyLines = decisionHistory.length
        ? decisionHistory.map(
            (item) =>
              `- ${formatTimestamp(new Date(item.timestamp))}: ${item.alternative} | Score: ${item.avgScore} | Acceptability: ${item.acceptabilityNormalized}`
          )
        : ["- Kein Verlauf vorhanden."];

      historyLines.forEach((line) => {
        const wrapped = doc.splitTextToSize(line, pageWidth - 28);
        if (y + wrapped.length * 5 > 280) {
          doc.addPage();
          y = 18;
        }
        doc.text(wrapped, 14, y);
        y += wrapped.length * 5;
      });

      y += 4;
      if (y > 250) {
        doc.addPage();
        y = 18;
      }

      doc.setFontSize(14);
      doc.text("Audit Trail", 14, y);
      y += 8;
      doc.setFontSize(10);

      const auditLines = auditTrail.length
        ? auditTrail.map(
            (item) =>
              `- ${formatTimestamp(new Date(item.timestamp))}: ${item.action} - ${item.details}`
          )
        : ["- Kein Audit Trail vorhanden."];

      auditLines.forEach((line) => {
        const wrapped = doc.splitTextToSize(line, pageWidth - 28);
        if (y + wrapped.length * 5 > 280) {
          doc.addPage();
          y = 18;
        }
        doc.text(wrapped, 14, y);
        y += wrapped.length * 5;
      });

      doc.save("travel-decision-report.pdf");
      setLastExportType("PDF");
      logAudit("EXPORT_PDF", "Ergebnisse wurden als PDF-Datei heruntergeladen.");
    } catch (error) {
      console.error("PDF export failed:", error);
      logAudit("EXPORT_PDF_ERROR", "PDF-Download ist fehlgeschlagen.");
    }
  }

    function setRating(participant, alternative, criterionName, value) {
    const key = `${participant}__${alternative}__${criterionName}`;
    setRatings((prev) => ({
      ...prev,
      [key]: clamp(value, 1, 5),
    }));
    logAudit(
      "SET_RATING",
      `${participant} bewertete ${alternative} für ${criterionName} mit ${clamp(value, 1, 5)}.`
    );
  }

  function addParticipant() {
    const value = newParticipant.trim();
    if (!value || participants.includes(value)) return;

    setParticipants((prev) => [...prev, value]);

    const nextRatings = { ...ratings };
    alternatives.forEach((a) => {
      criteria.forEach((c) => {
        nextRatings[`${value}__${a}__${c.name}`] = 3;
      });
    });
    setRatings(nextRatings);

    setNewParticipant("");
    logAudit("ADD_PARTICIPANT", `Teilnehmende Person hinzugefügt: ${value}.`);
  }

  function addCriterion() {
    const value = newCriterion.trim();
    if (!value || criteria.some((c) => c.name === value)) return;

    setCriteria((prev) => [...prev, { name: value, weight: 20 }]);

    const nextRatings = { ...ratings };
    participants.forEach((p) => {
      alternatives.forEach((a) => {
        nextRatings[`${p}__${a}__${value}`] = 3;
      });
    });
    setRatings(nextRatings);

    setNewCriterion("");
    logAudit("ADD_CRITERION", `Kriterium hinzugefügt: ${value}.`);
  }

  function addAlternative() {
    const value = newAlternative.trim();
    if (!value || alternatives.includes(value)) return;

    setAlternatives((prev) => [...prev, value]);

    const nextRatings = { ...ratings };
    participants.forEach((p) => {
      criteria.forEach((c) => {
        nextRatings[`${p}__${value}__${c.name}`] = 3;
      });
    });
    setRatings(nextRatings);

    setNewAlternative("");
    logAudit("ADD_ALTERNATIVE", `Reiseoption hinzugefügt: ${value}.`);
  }

  function removeParticipant(name) {
    setParticipants((prev) => prev.filter((p) => p !== name));
    logAudit("REMOVE_PARTICIPANT", `Teilnehmende Person entfernt: ${name}.`);
  }

  function removeAlternative(name) {
    setAlternatives((prev) => prev.filter((a) => a !== name));
    logAudit("REMOVE_ALTERNATIVE", `Reiseoption entfernt: ${name}.`);
  }

  function removeCriterion(name) {
    setCriteria((prev) => prev.filter((c) => c.name !== name));
    logAudit("REMOVE_CRITERION", `Kriterium entfernt: ${name}.`);
  }

  const steps = [
    { label: "Team", icon: Users },
    { label: "Kriterien", icon: ListChecks },
    { label: "Optionen", icon: Plane },
    { label: "Bewerten", icon: Sparkles },
    { label: "Ergebnis", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 md:grid-cols-[1.5fr_1fr]"
        >
          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <Plane className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Travel Decision Assistant</CardTitle>
                  <CardDescription>
                    DSP-Prototyp für das Apple-Szenario: gemeinsame Reiseentscheidungen einfach, klar und intuitiv treffen.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="text-sm text-slate-500">Teilnehmende</div>
                  <div className="mt-1 text-2xl font-semibold">{participants.length}</div>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="text-sm text-slate-500">Reiseoptionen</div>
                  <div className="mt-1 text-2xl font-semibold">{alternatives.length}</div>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="text-sm text-slate-500">Bewertungen erfasst</div>
                  <div className="mt-1 text-2xl font-semibold">{completion}%</div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>Projektfortschritt</span>
                  <span>{completion}%</span>
                </div>
                <Progress value={completion} className="h-3" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle>Empfohlene Reise</CardTitle>
              <CardDescription>Automatisch aus den Gruppenbewertungen berechnet.</CardDescription>
            </CardHeader>

            <CardContent>
              {topChoice ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className="rounded-full">Top Choice</Badge>
                    <span className="text-xl font-semibold">{topChoice.alternative}</span>
                  </div>
                  <div className="text-sm text-slate-600">Gruppenscore: {topChoice.avgScore.toFixed(2)} / 5</div>
                  <div className="text-sm text-slate-600">Commitment: {topChoice.commitment}%</div>
                  <div className="text-sm text-slate-600">Meinungsunterschied: {topChoice.disagreement}</div>
                  <div className="text-sm text-slate-600">Entropie: {topChoice.entropy}</div>
                  <div className="text-sm text-slate-600">Acceptability: {topChoice.acceptabilityNormalized}</div>
                </div>
              ) : (
                <div className="text-sm text-slate-500">Noch keine Daten vorhanden.</div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <Card className="rounded-3xl shadow-sm">
          <CardContent className="flex flex-col gap-4 p-4 md:p-6">
            <div className="grid gap-2 md:grid-cols-5">
              {steps.map((s, index) => {
                const Icon = s.icon;
                const active = index === step;

                return (
                  <button
                    key={s.label}
                    onClick={() => setStep(index)}
                    className={`flex items-center justify-center gap-2 rounded-2xl border p-3 text-sm transition ${
                      active
                        ? "bg-gradient-to-r from-blue-500 to-pink-500 text-white"
                        : "bg-white hover:bg-pink-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {s.label}
                  </button>
                );
              })}
            </div>

            <Separator />

            <div className="flex flex-wrap gap-2">
              <Button onClick={exportAsPDF} className="rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                <FileText className="mr-2 h-4 w-4" />
                PDF herunterladen
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs value={String(step)} onValueChange={(v) => setStep(Number(v))}>
          <TabsList className="hidden" />

          <TabsContent value="0" className="mt-0">
            <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle>1. Team festlegen</CardTitle>
                <CardDescription>Wer nimmt an der Gruppenentscheidung teil?</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newParticipant}
                    onChange={(e) => setNewParticipant(e.target.value)}
                    placeholder="Name hinzufügen"
                  />
                  <Button
                    className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
                    onClick={addParticipant}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Hinzufügen
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {participants.map((p) => (
                    <Badge key={p} variant="secondary" className="rounded-full px-3 py-2 text-sm">
                      {p}
                      <button className="ml-2" onClick={() => removeParticipant(p)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="1" className="mt-0">
            <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle>2. Kriterien wählen</CardTitle>
                <CardDescription>Was ist für die Reiseentscheidung wichtig?</CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="flex gap-2">
                  <Input
                    value={newCriterion}
                    onChange={(e) => setNewCriterion(e.target.value)}
                    placeholder="Kriterium hinzufügen"
                  />
                  <Button
                    className="bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                    onClick={addCriterion}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Hinzufügen
                  </Button>
                </div>

                <div className="space-y-4">
                  {criteria.map((c, idx) => (
                    <div key={c.name} className="rounded-2xl border bg-white p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="font-medium">{c.name}</div>
                        <button onClick={() => removeCriterion(c.name)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <Label className="text-sm text-slate-500">Gewichtung: {c.weight}</Label>

                      <Slider
                        value={[Number(c.weight)]}
                        min={0}
                        max={100}
                        step={5}
                        onValueChange={(value) => {
                          const next = [...criteria];
                          next[idx] = { ...next[idx], weight: value[0] };
                          setCriteria(next);
                          logAudit("UPDATE_WEIGHT", `Gewichtung für ${c.name} wurde auf ${value[0]} gesetzt.`);
                        }}
                        className="mt-3"
                      />

                      <div className="mt-2 text-xs text-slate-500">
                        Normalisiert: {criteriaWithWeights.find((x) => x.name === c.name)?.normalizedWeight.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="2" className="mt-0">
            <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle>3. Reiseoptionen definieren</CardTitle>
                <CardDescription>Welche Reiseziele sollen verglichen werden?</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newAlternative}
                    onChange={(e) => setNewAlternative(e.target.value)}
                    placeholder="Reiseziel hinzufügen"
                  />
                  <Button
                    className="bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600"
                    onClick={addAlternative}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Hinzufügen
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {alternatives.map((a) => (
                    <Badge key={a} variant="secondary" className="rounded-full px-3 py-2 text-sm">
                      {a}
                      <button className="ml-2" onClick={() => removeAlternative(a)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="3" className="mt-0">
            <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle>4. Bewertungen eingeben</CardTitle>
                <CardDescription>Jede Person bewertet jede Reiseoption auf einer Skala von 1 bis 5.</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {participants.map((participant) => (
                  <div key={participant} className="rounded-2xl border bg-white p-4">
                    <div className="mb-4 text-lg font-semibold">{participant}</div>

                    <div className="space-y-5">
                      {alternatives.map((alternative) => (
                        <div
                          key={alternative}
                          className="rounded-2xl bg-gradient-to-br from-sky-100 via-pink-100 to-yellow-100 p-4"
                        >
                          <div className="mb-3 font-medium">{alternative}</div>

                          <div className="grid gap-4 md:grid-cols-2">
                            {criteria.map((criterion) => {
                              const key = `${participant}__${alternative}__${criterion.name}`;
                              const value = Number(ratings[key] ?? 3);

                              return (
                                <div key={key} className="rounded-xl bg-white p-3 shadow-sm">
                                  <div className="mb-2 flex items-center justify-between text-sm">
                                    <span>{criterion.name}</span>
                                    <span className="font-medium">{value}/5</span>
                                  </div>

                                  <Slider
                                    value={[value]}
                                    min={1}
                                    max={5}
                                    step={1}
                                    onValueChange={(v) => setRating(participant, alternative, criterion.name, v[0])}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="4" className="mt-0">
            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <div className="space-y-6">
                <Card className="rounded-3xl shadow-sm">
                  <CardHeader>
                    <CardTitle>5. Ergebnisübersicht</CardTitle>
                    <CardDescription>
                      Die App kombiniert Gruppenbewertungen und zeigt die beste Alternative an.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {results.map((result, idx) => (
                      <motion.div
                        key={result.alternative}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="rounded-2xl border bg-white p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              {idx === 0 && <CheckCircle2 className="h-5 w-5" />}
                              <span className="text-lg font-semibold">{result.alternative}</span>
                            </div>
                            <div className="mt-1 text-sm text-slate-500">
                              Rang #{idx + 1} · Gruppenscore {result.avgScore.toFixed(2)} / 5
                            </div>
                          </div>

                          <Badge className="rounded-full">Commitment {result.commitment}%</Badge>
                        </div>

                        <Separator className="my-4" />

                        <div className="grid gap-2 md:grid-cols-3">
                          {result.byParticipant.map((entry) => (
                            <div
                              key={entry.participant}
                              className="rounded-xl bg-gradient-to-br from-sky-100 via-pink-100 to-yellow-100 p-3 text-sm"
                            >
                              <div className="text-slate-500">{entry.participant}</div>
                              <div className="font-medium">{entry.score.toFixed(2)} / 5</div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 space-y-1 text-sm text-slate-600">
                          <div>Meinungsunterschied: {result.disagreement}</div>
                          <div>Entropie: {result.entropy}</div>
                          <div>Raw Acceptability: {result.acceptabilityRaw}</div>
                          <div>Normalized Acceptability: {result.acceptabilityNormalized}</div>
                        </div>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="rounded-3xl shadow-sm">
                  <CardHeader>
                    <CardTitle>Ergebnisdiagramm</CardTitle>
                    <CardDescription>Visualisierung der Gruppenscores aller Reiseoptionen.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[320px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis domain={[0, 5]} />
                          <Tooltip />
                          <Bar dataKey="score" radius={[12, 12, 0, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${entry.name}`} fill={index === 0 ? "#60a5fa" : "#c4b5fd"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="rounded-3xl shadow-sm">
                  <CardHeader>
                    <CardTitle>Erklärbare Entscheidung</CardTitle>
                    <CardDescription>Warum wurde diese Reise empfohlen?</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {insights.map((line) => (
                      <div
                        key={line}
                        className="rounded-2xl bg-gradient-to-br from-sky-100 via-pink-100 to-yellow-100 p-3 text-sm"
                      >
                        {line}
                      </div>
                    ))}

                    <Separator />

                    <div>
                      <div className="mb-2 text-sm font-medium">Gewichtete Kriterien</div>
                      <div className="space-y-2">
                        {criteriaWithWeights.map((c) => (
                          <div
                            key={c.name}
                            className="flex items-center justify-between rounded-xl bg-white p-3 text-sm shadow-sm"
                          >
                            <span>{c.name}</span>
                            <span>{c.normalizedWeight.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <div className="mb-2 text-sm font-medium">Consensus Steps</div>
                      <div className="space-y-2">
                        {consensusSteps.map((line, idx) => (
                          <div
                            key={idx}
                            className="rounded-2xl bg-gradient-to-br from-sky-100 via-pink-100 to-yellow-100 p-3 text-sm"
                          >
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Decision History
                    </CardTitle>
                    <CardDescription>سجل القرارات السابقة وأفضل البدائل عبر الزمن.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {decisionHistory.length === 0 ? (
                      <div className="text-sm text-slate-500">لا يوجد سجل قرارات بعد.</div>
                    ) : (
                      decisionHistory.map((item) => (
                        <div key={item.id} className="rounded-2xl border bg-white p-3 text-sm">
                          <div className="font-medium">{item.alternative}</div>
                          <div className="text-slate-500">{formatTimestamp(new Date(item.timestamp))}</div>
                          <div>Score: {item.avgScore} / 5</div>
                          <div>Acceptability: {item.acceptabilityNormalized}</div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-3xl shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5" />
                      Audit Trail
                    </CardTitle>
                    <CardDescription>سجل تفصيلي لكل تعديل أو تصدير داخل النظام.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-[420px] overflow-auto">
                    {auditTrail.length === 0 ? (
                      <div className="text-sm text-slate-500">لا يوجد audit trail بعد.</div>
                    ) : (
                      auditTrail.map((item) => (
                        <div key={item.id} className="rounded-2xl border bg-white p-3 text-sm">
                          <div className="font-medium">{item.action}</div>
                          <div className="text-slate-500">{formatTimestamp(new Date(item.timestamp))}</div>
                          <div>{item.details}</div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}