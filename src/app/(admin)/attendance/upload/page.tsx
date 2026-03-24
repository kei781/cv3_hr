"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ColumnMapping {
  id: string;
  name: string;
}

interface ParsedRow {
  rowNumber: number;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  workHours: string;
  overtime: string;
  status: string;
  validation: "OK" | "WARNING" | "ERROR";
  messages: string[];
}

interface UploadResult {
  batchId: string;
  rows: ParsedRow[];
  summary: {
    ok: number;
    warning: number;
    error: number;
  };
}

interface ConfirmResult {
  success: number;
  error: number;
  skipped: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AttendanceUploadPage() {
  // Step 1: File
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Template
  const [templates, setTemplates] = useState<ColumnMapping[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("default");
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // Step 3: Preview
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [warningActions, setWarningActions] = useState<Record<number, boolean>>({});
  const [skipAllWarnings, setSkipAllWarnings] = useState(false);

  // Step 4: Confirm
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState<ConfirmResult | null>(null);

  // Derived step
  const step = confirmResult
    ? 4
    : uploadResult
      ? 3
      : file
        ? 2
        : 1;

  // -------------------------------------------------------------------------
  // Step 1 handlers
  // -------------------------------------------------------------------------

  const handleFile = useCallback(
    async (selected: File) => {
      const ext = selected.name.split(".").pop()?.toLowerCase();
      if (ext !== "xlsx" && ext !== "xls") {
        toast.error("xlsx 또는 xls 파일만 업로드할 수 있습니다.");
        return;
      }
      setFile(selected);
      setUploadResult(null);
      setConfirmResult(null);

      // Fetch templates
      setIsLoadingTemplates(true);
      try {
        const res = await fetch("/api/admin/column-mappings");
        if (res.ok) {
          const data: ColumnMapping[] = await res.json();
          setTemplates(data);
        }
      } catch {
        // silently fall back to default template only
      } finally {
        setIsLoadingTemplates(false);
      }
    },
    [],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile],
  );

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) handleFile(selected);
    },
    [handleFile],
  );

  // -------------------------------------------------------------------------
  // Step 2 handler
  // -------------------------------------------------------------------------

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("templateId", selectedTemplateId);

      const res = await fetch("/api/admin/attendance/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message ?? "업로드에 실패했습니다.");
      }

      const data: UploadResult = await res.json();
      setUploadResult(data);

      // Initialise warning actions – all included by default
      const actions: Record<number, boolean> = {};
      data.rows.forEach((r) => {
        if (r.validation === "WARNING") {
          actions[r.rowNumber] = true;
        }
      });
      setWarningActions(actions);
      setSkipAllWarnings(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
    }
  }, [file, selectedTemplateId]);

  // -------------------------------------------------------------------------
  // Step 3 helpers
  // -------------------------------------------------------------------------

  const toggleWarningRow = useCallback((rowNumber: number) => {
    setWarningActions((prev) => ({ ...prev, [rowNumber]: !prev[rowNumber] }));
  }, []);

  const handleSkipAllWarnings = useCallback(
    (checked: boolean) => {
      setSkipAllWarnings(checked);
      if (!uploadResult) return;
      const actions: Record<number, boolean> = {};
      uploadResult.rows.forEach((r) => {
        if (r.validation === "WARNING") {
          actions[r.rowNumber] = !checked; // checked = skip all → exclude all
        }
      });
      setWarningActions(actions);
    },
    [uploadResult],
  );

  // Count included rows
  const includedCount = uploadResult
    ? uploadResult.rows.filter((r) => {
        if (r.validation === "OK") return true;
        if (r.validation === "WARNING") return warningActions[r.rowNumber];
        return false;
      }).length
    : 0;

  // -------------------------------------------------------------------------
  // Step 4 handler
  // -------------------------------------------------------------------------

  const handleConfirm = useCallback(async () => {
    if (!uploadResult) return;

    const ok = window.confirm(`${includedCount}건의 근태 데이터를 반영하시겠습니까?`);
    if (!ok) return;

    setIsConfirming(true);
    try {
      const res = await fetch(
        `/api/admin/attendance/upload/${uploadResult.batchId}/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            skipWarnings: skipAllWarnings,
            warningRowActions: warningActions,
          }),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message ?? "반영에 실패했습니다.");
      }

      const data: ConfirmResult = await res.json();
      setConfirmResult(data);
      toast.success(
        `성공: ${data.success}건, 오류: ${data.error}건, 제외: ${data.skipped}건`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "반영에 실패했습니다.");
    } finally {
      setIsConfirming(false);
    }
  }, [uploadResult, includedCount, skipAllWarnings, warningActions]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href="/admin/attendance"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; 근태관리
        </Link>
        <h1 className="text-2xl font-bold">근태 엑셀 업로드</h1>
      </div>

      {/* Step 1: File Upload */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">1. 파일 선택</h2>
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25"
          }`}
        >
          <Upload className="size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            엑셀 파일을 드래그 앤 드롭 하거나
          </p>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            파일 선택
          </Button>
          <Input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={onFileInputChange}
          />
        </div>
        {file && (
          <div className="flex items-center gap-2 text-sm">
            <FileSpreadsheet className="size-4 text-green-600" />
            <span>{file.name}</span>
          </div>
        )}
      </section>

      {/* Step 2: Template Selection */}
      {step >= 2 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">2. 템플릿 선택</h2>
          {isLoadingTemplates ? (
            <p className="text-sm text-muted-foreground">템플릿 불러오는 중...</p>
          ) : (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="template"
                  value="default"
                  checked={selectedTemplateId === "default"}
                  onChange={() => setSelectedTemplateId("default")}
                />
                기본 템플릿
              </label>
              {templates.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="template"
                    value={t.id}
                    checked={selectedTemplateId === t.id}
                    onChange={() => setSelectedTemplateId(t.id)}
                  />
                  {t.name}
                </label>
              ))}
            </div>
          )}
          <Button onClick={handleUpload} disabled={isUploading || !file}>
            {isUploading ? "분석 중..." : "업로드 및 분석"}
          </Button>
        </section>
      )}

      {/* Step 3: Preview & Validation */}
      {step >= 3 && uploadResult && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">3. 미리보기 및 검증</h2>

          {/* Summary bar */}
          <div className="flex flex-wrap gap-3">
            <Badge variant="default">
              <CheckCircle className="size-3" />
              성공: {uploadResult.summary.ok}건
            </Badge>
            <Badge variant="destructive">
              <XCircle className="size-3" />
              오류: {uploadResult.summary.error}건(자동 제외)
            </Badge>
            <Badge variant="secondary">
              <AlertTriangle className="size-3" />
              경고: {uploadResult.summary.warning}건
            </Badge>
          </div>

          {/* Skip all warnings */}
          {uploadResult.summary.warning > 0 && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={skipAllWarnings}
                onChange={(e) => handleSkipAllWarnings(e.target.checked)}
              />
              경고 행 전체 제외
            </label>
          )}

          {/* Preview table */}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">행번호</th>
                  <th className="px-3 py-2 text-left font-medium">직원</th>
                  <th className="px-3 py-2 text-left font-medium">날짜</th>
                  <th className="px-3 py-2 text-left font-medium">출근</th>
                  <th className="px-3 py-2 text-left font-medium">퇴근</th>
                  <th className="px-3 py-2 text-left font-medium">근무시간</th>
                  <th className="px-3 py-2 text-left font-medium">초과근무</th>
                  <th className="px-3 py-2 text-left font-medium">상태</th>
                  <th className="px-3 py-2 text-left font-medium">검증결과</th>
                  {uploadResult.summary.warning > 0 && (
                    <th className="px-3 py-2 text-left font-medium">포함/제외</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {uploadResult.rows.slice(0, 50).map((row) => {
                  const bgClass =
                    row.validation === "ERROR"
                      ? "bg-red-50"
                      : row.validation === "WARNING"
                        ? "bg-yellow-50"
                        : "";
                  return (
                    <tr key={row.rowNumber} className={`border-b ${bgClass}`}>
                      <td className="px-3 py-2">{row.rowNumber}</td>
                      <td className="px-3 py-2">{row.employeeName}</td>
                      <td className="px-3 py-2">{row.date}</td>
                      <td className="px-3 py-2">{row.checkIn}</td>
                      <td className="px-3 py-2">{row.checkOut}</td>
                      <td className="px-3 py-2">{row.workHours}</td>
                      <td className="px-3 py-2">{row.overtime}</td>
                      <td className="px-3 py-2">{row.status}</td>
                      <td className="px-3 py-2">
                        {row.validation === "ERROR" && (
                          <span className="text-red-600">
                            {row.messages.join(", ")}
                          </span>
                        )}
                        {row.validation === "WARNING" && (
                          <span className="text-yellow-600">
                            {row.messages.join(", ")}
                          </span>
                        )}
                        {row.validation === "OK" && (
                          <span className="text-green-600">OK</span>
                        )}
                      </td>
                      {uploadResult.summary.warning > 0 && (
                        <td className="px-3 py-2">
                          {row.validation === "WARNING" && (
                            <input
                              type="checkbox"
                              checked={!!warningActions[row.rowNumber]}
                              onChange={() => toggleWarningRow(row.rowNumber)}
                            />
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Confirm button */}
          <Button
            onClick={handleConfirm}
            disabled={isConfirming || includedCount === 0}
          >
            {isConfirming ? "반영 중..." : `반영 (${includedCount}건)`}
          </Button>
        </section>
      )}

      {/* Step 4: Complete */}
      {step === 4 && confirmResult && (
        <section className="space-y-4 rounded-lg border bg-muted/30 p-6 text-center">
          <CheckCircle className="mx-auto size-12 text-green-600" />
          <h2 className="text-lg font-semibold">업로드 완료</h2>
          <p className="text-sm text-muted-foreground">
            성공: {confirmResult.success}건 &middot; 오류: {confirmResult.error}건
            &middot; 제외: {confirmResult.skipped}건
          </p>
          <Link href="/admin/attendance">
            <Button variant="outline">근태관리로 돌아가기</Button>
          </Link>
        </section>
      )}
    </div>
  );
}
