import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, Link as LinkIcon, Loader2, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { parseFile, extractGoogleSheetsId, parseGoogleSheetsUrl } from '@/lib/fileParser';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  onFileProcessed: (data: {
    fileName: string;
    fileType: 'excel' | 'csv' | 'google_sheets';
    rawFile: File | null;
    columns: any[];
    data: Record<string, unknown>[];
    rowCount: number;
  }) => void;
  isProcessing: boolean;
}

export default function FileUpload({ onFileProcessed, isProcessing }: FileUploadProps) {
  const [uploadMethod, setUploadMethod] = useState<'file' | 'link'>('file');
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const uploadedFile = acceptedFiles[0];
    setFile(uploadedFile);
    setIsLoading(true);

    try {
      const parsed = await parseFile(uploadedFile);
      onFileProcessed({ ...parsed, rawFile: uploadedFile });
    } catch (error) {
      toast({
        title: 'Erro ao processar arquivo',
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive',
      });
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  }, [onFileProcessed, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    disabled: isLoading || isProcessing,
  });

  const handleGoogleSheetsSubmit = async () => {
    if (!googleSheetsUrl) {
      toast({
        title: 'URL obrigatória',
        description: 'Cole o link da planilha do Google Sheets.',
        variant: 'destructive',
      });
      return;
    }

    const sheetId = extractGoogleSheetsId(googleSheetsUrl);
    if (!sheetId) {
      toast({
        title: 'URL inválida',
        description: 'Verifique se o link é de uma planilha do Google Sheets.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const parsed = await parseGoogleSheetsUrl(googleSheetsUrl);
      onFileProcessed({ ...parsed, rawFile: null });
    } catch (error) {
      toast({
        title: 'Erro ao carregar Google Sheets',
        description: error instanceof Error ? error.message : 'Não foi possível acessar a planilha. Verifique se ela está pública.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
  };

  return (
    <div className="space-y-6">
      {/* Upload Method Toggle */}
      <div className="flex rounded-lg bg-muted p-1">
        <button
          onClick={() => setUploadMethod('file')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all',
            uploadMethod === 'file'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Enviar Arquivo
        </button>
        <button
          onClick={() => setUploadMethod('link')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all',
            uploadMethod === 'link'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <LinkIcon className="w-4 h-4" />
          Google Sheets
        </button>
      </div>

      {uploadMethod === 'file' ? (
        <>
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={cn(
              'relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200',
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-accent/50',
              (isLoading || isProcessing) && 'opacity-50 cursor-not-allowed'
            )}
          >
            <input {...getInputProps()} />
            
            {file ? (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-xl bg-dataviz-green-light flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-dataviz-green" />
                </div>
                <p className="text-lg font-medium text-foreground mb-1">{file.name}</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
                {!isLoading && !isProcessing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFile();
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Trocar arquivo
                  </Button>
                )}
              </div>
            ) : isLoading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-lg font-medium text-foreground">Processando arquivo...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <p className="text-lg font-medium text-foreground mb-2">
                  {isDragActive ? 'Solte o arquivo aqui' : 'Arraste sua planilha ou clique para selecionar'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Formatos aceitos: Excel (.xlsx, .xls) ou CSV (.csv)
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Cole o link da planilha do Google Sheets"
              value={googleSheetsUrl}
              onChange={(e) => setGoogleSheetsUrl(e.target.value)}
              className="h-12"
              disabled={isLoading || isProcessing}
            />
            <p className="text-xs text-muted-foreground">
              Ex: https://docs.google.com/spreadsheets/d/1abc.../edit
            </p>
          </div>
          <Button
            onClick={handleGoogleSheetsSubmit}
            className="w-full h-12"
            disabled={isLoading || isProcessing || !googleSheetsUrl}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Carregando...
              </>
            ) : (
              'Carregar planilha'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
