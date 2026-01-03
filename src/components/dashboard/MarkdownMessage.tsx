import React from 'react';
import { cn } from '@/lib/utils';

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

/**
 * Componente para renderizar mensagens markdown de forma legível
 * Suporta: títulos, listas, tabelas, negrito, código
 */
export function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  const renderContent = () => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: string[] = [];
    let currentTable: string[][] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-2 ml-4">
            {currentList.map((item, idx) => (
              <li key={idx} className="text-sm">{item}</li>
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    const flushTable = () => {
      if (currentTable.length > 0) {
        elements.push(
          <div key={`table-${elements.length}`} className="overflow-x-auto my-3">
            <table className="min-w-full border-collapse border border-gray-300 text-xs">
              <thead className="bg-gray-100">
                <tr>
                  {currentTable[0].map((cell, idx) => (
                    <th key={idx} className="border border-gray-300 px-2 py-1 text-left font-semibold">
                      {cell.trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentTable.slice(2).map((row, rowIdx) => (
                  <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="border border-gray-300 px-2 py-1">
                        {cell.trim()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        currentTable = [];
      }
    };

    const flushCodeBlock = () => {
      if (codeBlockContent.length > 0) {
        elements.push(
          <pre key={`code-${elements.length}`} className="bg-gray-900 text-gray-100 p-3 rounded-md overflow-x-auto my-2 text-xs">
            <code>{codeBlockContent.join('\n')}</code>
          </pre>
        );
        codeBlockContent = [];
      }
    };

    lines.forEach((line, idx) => {
      // Code blocks
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock();
          inCodeBlock = false;
        } else {
          flushList();
          flushTable();
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      // Títulos
      if (line.startsWith('###')) {
        flushList();
        flushTable();
        elements.push(
          <h3 key={idx} className="font-bold text-base mt-4 mb-2 text-gray-800">
            {line.replace(/^###\s*/, '')}
          </h3>
        );
        return;
      }

      if (line.startsWith('##')) {
        flushList();
        flushTable();
        elements.push(
          <h2 key={idx} className="font-bold text-lg mt-4 mb-2 text-gray-900">
            {line.replace(/^##\s*/, '')}
          </h2>
        );
        return;
      }

      if (line.startsWith('#')) {
        flushList();
        flushTable();
        elements.push(
          <h1 key={idx} className="font-bold text-xl mt-4 mb-3 text-gray-900">
            {line.replace(/^#\s*/, '')}
          </h1>
        );
        return;
      }

      // Tabelas
      if (line.trim().startsWith('|')) {
        flushList();
        const cells = line.split('|').filter(c => c.trim()).map(c => c.trim());
        currentTable.push(cells);
        return;
      } else if (currentTable.length > 0) {
        flushTable();
      }

      // Listas
      if (line.trim().match(/^[-*]\s/)) {
        flushTable();
        currentList.push(line.trim().replace(/^[-*]\s/, ''));
        return;
      } else if (currentList.length > 0) {
        flushList();
      }

      // Linha vazia
      if (line.trim() === '') {
        flushList();
        flushTable();
        elements.push(<div key={idx} className="h-2" />);
        return;
      }

      // Parágrafo normal
      flushList();
      flushTable();
      
      // Processar negrito e código inline
      let processedLine = line;
      
      // Negrito **texto**
      processedLine = processedLine.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
      
      // Código inline `texto`
      processedLine = processedLine.replace(/`(.+?)`/g, '<code class="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono">$1</code>');

      elements.push(
        <p 
          key={idx} 
          className="text-sm leading-relaxed my-1"
          dangerouslySetInnerHTML={{ __html: processedLine }}
        />
      );
    });

    // Flush remaining
    flushList();
    flushTable();
    flushCodeBlock();

    return elements;
  };

  return (
    <div className={cn('prose prose-sm max-w-none', className)}>
      {renderContent()}
    </div>
  );
}
