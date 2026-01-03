import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, X, Sparkles, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage, ChatContext, DashboardChatProps } from '@/types/newDashboard.types';
import { askAiForWidget } from '@/lib/webhookService';
import { useAuth } from '@/hooks/useAuth';
import { MarkdownMessage } from './MarkdownMessage';

const SUGGESTED_QUESTIONS = [
  "Isso é bom ou ruim?",
  "Tem algo fora do padrão?",
  "Onde devo prestar atenção?",
  "Por que esse mês caiu?",
  "O que significa esse número?",
  "Como melhorar esse resultado?",
];

export default function DashboardChat({ 
  dashboardId, 
  context, 
  position = 'right',
  isOpen: controlledIsOpen,
  onToggle 
}: DashboardChatProps) {
  const { user } = useAuth();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  
  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalIsOpen(!internalIsOpen);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !user) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const question = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // Frontend NÃO envia dados analíticos - apenas IDs
      // Backend busca métricas/charts de ai_decisions
      const result = await askAiForWidget(user.id, dashboardId, question, {
        aiDecisionId: context.aiDecisionId,
      });

      let responseContent = '';

      if (result.status === 'success') {
        if (result.analysis_unavailable) {
          // Análise não disponível - mensagem amigável
          responseContent = result.answer || 'Este dashboard ainda não possui essa análise.';
          if (result.suggestion) {
            responseContent += '\n\n' + result.suggestion;
          }
        } else if (result.answer) {
          // Resposta de chat normal
          responseContent = result.answer;
          if (result.insights && result.insights.length > 0) {
            responseContent += '\n\n📊 Insights:\n' + result.insights.map(i => `• ${i}`).join('\n');
          }
        } else {
          responseContent = 'Recebi sua pergunta, mas não consegui gerar uma resposta adequada.';
        }
      } else {
        responseContent = result.message || 'Desculpe, não consegui processar sua pergunta no momento.';
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, não consegui processar sua pergunta no momento. Tente novamente.',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={handleToggle}
        className={cn(
          'fixed z-50 rounded-full w-14 h-14 shadow-lg',
          position === 'right' ? 'bottom-6 right-6' : 'bottom-6 right-6'
        )}
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <Card 
      className={cn(
        'fixed z-50 shadow-2xl border-2',
        position === 'right' 
          ? 'bottom-6 right-6 w-96 h-[600px]' 
          : 'bottom-6 left-1/2 -translate-x-1/2 w-[800px] h-96'
      )}
    >
      <CardHeader className="pb-3 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-base">Assistente do Dashboard</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={handleToggle}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Tire dúvidas sobre os resultados. Não faço cálculos, apenas explico.
        </p>
      </CardHeader>

      <CardContent className="p-0 flex flex-col h-[calc(100%-120px)]">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Lightbulb className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">Como posso ajudar?</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Faça perguntas sobre os resultados do dashboard. Estou aqui para explicar e orientar.
              </p>
            </div>
            <div className="w-full space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Perguntas sugeridas:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {SUGGESTED_QUESTIONS.map((question, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="text-xs h-auto py-2 px-3 text-left justify-start"
                    onClick={() => handleSuggestedQuestion(question)}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg p-3',
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 shadow-sm'
                  )}
                >
                  {message.role === 'user' ? (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <MarkdownMessage content={message.content} />
                  )}
                  <p className={cn(
                    "text-xs mt-2 pt-2 border-t",
                    message.role === 'user' 
                      ? 'opacity-70 border-white/20' 
                      : 'opacity-50 border-gray-200'
                  )}>
                    {message.timestamp.toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        <div className="border-t p-4 bg-white">
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua pergunta..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              💡 Dica: Pergunte sobre os números, não peça cálculos
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
