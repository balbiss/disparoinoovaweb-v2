import { useState, useEffect, useRef, useCallback } from 'react';
import { Node, Edge } from 'reactflow';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

interface FlowPreviewModalProps {
  nodes: Node[];
  edges: Edge[];
  onClose: () => void;
}

interface Message {
  id: string;
  type: 'bot' | 'user';
  content: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  mediaUrl?: string;
  timestamp: Date;
}

export function FlowPreviewModal({ nodes, edges, onClose }: FlowPreviewModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [flowEnded, setFlowEnded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const currentNodeIdRef = useRef<string | null>(null);
  const startedRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fechar emoji picker ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as HTMLElement)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const addMessage = useCallback((type: 'bot' | 'user', content: string, mediaType?: Message['mediaType'], mediaUrl?: string) => {
    setMessages(prev => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        type,
        content,
        mediaType,
        mediaUrl,
        timestamp: new Date(),
      },
    ]);
  }, []);

  const processNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
      setFlowEnded(true);
      return;
    }

    const nodeType = node.data?.nodeType || node.type;
    currentNodeIdRef.current = nodeId;
    setCurrentNodeId(nodeId);

    if (nodeType === 'stop') {
      addMessage('bot', '🛑 Fim do fluxo.');
      setFlowEnded(true);
      return;
    }

    if (nodeType === 'delay') {
      const config = node.data?.config || {};
      const delaySeconds = config.value || config.delaySeconds || config.seconds || config.delay || 2;
      addMessage('bot', `⏱️ [Aguardando ${delaySeconds} segundo(s)...]`);

      const nextEdge = edges.find(e => e.source === nodeId);
      if (nextEdge) {
        setTimeout(() => processNode(nextEdge.target), Math.min(delaySeconds * 1000, 3000)); // no preview, max 3s
      } else {
        setFlowEnded(true);
      }
      return;
    }

    const messageNodeTypes = ['action', 'text', 'image', 'video', 'audio', 'document'];
    if (messageNodeTypes.includes(nodeType)) {
      const config = node.data?.config || {};
      let content = '';
      let mediaType: Message['mediaType'] = undefined;
      let mediaUrl: string | undefined = undefined;

      if (nodeType === 'text' || nodeType === 'action') {
        content = config.content || config.message || '(sem conteúdo)';
      } else if (nodeType === 'image') {
        content = config.caption || '📷 Imagem';
        mediaType = 'image';
        mediaUrl = config.mediaUrl;
      } else if (nodeType === 'video') {
        content = config.caption || '🎥 Vídeo';
        mediaType = 'video';
        mediaUrl = config.mediaUrl;
      } else if (nodeType === 'audio') {
        content = '🎵 Áudio';
        mediaType = 'audio';
        mediaUrl = config.mediaUrl;
      } else if (nodeType === 'document') {
        content = `📄 ${config.fileName || 'Documento'}`;
        mediaType = 'document';
        mediaUrl = config.mediaUrl;
      }

      addMessage('bot', content, mediaType, mediaUrl);

      // Verificar próximo nó
      const nextEdge = edges.find(e => e.source === nodeId);
      if (nextEdge) {
        const nextNode = nodes.find(n => n.id === nextEdge.target);
        if (!nextNode) { setFlowEnded(true); return; }
        const nextType = nextNode.data?.nodeType || nextNode.type;

        if (nextType === 'condition') {
          // Aguardar resposta do usuário
          currentNodeIdRef.current = nextNode.id;
          setCurrentNodeId(nextNode.id);
          return;
        } else {
          setTimeout(() => processNode(nextEdge.target), 600);
        }
      } else {
        setTimeout(() => {
          addMessage('bot', '✅ Fim do fluxo.');
          setFlowEnded(true);
        }, 600);
      }
      return;
    }

    if (nodeType === 'condition') {
      // Aguardar resposta do usuário
      return;
    }

    // Nó desconhecido — pular para próximo
    const nextEdge = edges.find(e => e.source === nodeId);
    if (nextEdge) {
      setTimeout(() => processNode(nextEdge.target), 300);
    } else {
      setFlowEnded(true);
    }
  }, [nodes, edges, addMessage]);

  // Iniciar fluxo uma única vez
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const triggerNode = nodes.find(n => (n.data?.nodeType || n.type) === 'trigger');
    if (!triggerNode) {
      addMessage('bot', '⚠️ Nenhum nó Trigger encontrado no fluxo.');
      return;
    }

    const firstEdge = edges.find(e => e.source === triggerNode.id);
    if (!firstEdge) {
      addMessage('bot', '⚠️ O Trigger não está conectado a nenhum nó.');
      return;
    }

    setTimeout(() => processNode(firstEdge.target), 500);
  }, [nodes, edges, addMessage, processNode]);

  const processUserResponse = useCallback((input: string) => {
    const nodeId = currentNodeIdRef.current;
    if (!nodeId) {
      addMessage('bot', '⚠️ Nenhum nó ativo.');
      return;
    }

    const currentNode = nodes.find(n => n.id === nodeId);
    if (!currentNode) return;

    const nodeType = currentNode.data?.nodeType || currentNode.type;
    const nextEdges = edges.filter(e => e.source === nodeId);

    if (nextEdges.length === 0) {
      addMessage('bot', '✅ Fim do fluxo.');
      setFlowEnded(true);
      return;
    }

    if (nodeType === 'condition') {
      const config = currentNode.data?.config || {};
      const operator = config.operator || 'contains';
      const value = (config.value || '').toLowerCase();
      const normalizedInput = input.toLowerCase();

      let conditionMet = false;
      switch (operator) {
        case 'equals': case '==': conditionMet = normalizedInput === value; break;
        case 'contains': conditionMet = normalizedInput.includes(value); break;
        case 'startsWith': conditionMet = normalizedInput.startsWith(value); break;
        case 'endsWith': conditionMet = normalizedInput.endsWith(value); break;
        case 'notEquals': case '!=': conditionMet = normalizedInput !== value; break;
        default: conditionMet = normalizedInput.includes(value);
      }

      const targetEdge = nextEdges.find(e => {
        const label = e.label?.toString().toLowerCase() || '';
        return conditionMet
          ? ['true', 'sim', 'yes', 'verdadeiro'].includes(label)
          : ['false', 'não', 'nao', 'no', 'falso'].includes(label);
      }) || nextEdges[0];

      if (targetEdge) {
        setTimeout(() => processNode(targetEdge.target), 400);
      }
    } else {
      const nextEdge = nextEdges[0];
      if (nextEdge) setTimeout(() => processNode(nextEdge.target), 400);
    }
  }, [nodes, edges, addMessage, processNode]);

  const handleSendMessage = () => {
    if (!userInput.trim() || isProcessing || flowEnded) return;
    setIsProcessing(true);
    const input = userInput.trim();
    addMessage('user', input);
    setUserInput('');
    setTimeout(() => {
      processUserResponse(input);
      setIsProcessing(false);
    }, 300);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setUserInput(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleRestart = () => {
    setMessages([]);
    setCurrentNodeId(null);
    currentNodeIdRef.current = null;
    setFlowEnded(false);
    startedRef.current = false;

    const triggerNode = nodes.find(n => (n.data?.nodeType || n.type) === 'trigger');
    if (!triggerNode) return;
    const firstEdge = edges.find(e => e.source === triggerNode.id);
    if (!firstEdge) return;
    startedRef.current = true;
    setTimeout(() => processNode(firstEdge.target), 500);
  };

  return (
    <aside className="w-[320px] max-w-[90vw] h-[85vh] absolute bottom-4 right-4 bg-white rounded-2xl flex flex-col shadow-2xl z-40 overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between bg-brand-primary">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Preview do Bot</h2>
            <p className="text-xs text-brand-secondary">Teste o fluxo antes de publicar</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRestart}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            title="Reiniciar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-10">
            <p className="text-sm">Iniciando conversa...</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.type === 'bot' && (
              <div className="w-7 h-7 bg-brand-secondary/20 rounded-full flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                <span className="text-sm">🤖</span>
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                message.type === 'user'
                  ? 'bg-brand-primary text-white rounded-br-none'
                  : 'bg-white text-gray-800 shadow-sm rounded-bl-none border border-gray-100'
              }`}
            >
              {message.mediaType === 'image' && message.mediaUrl && (
                <img src={message.mediaUrl} alt="Imagem" className="rounded-lg mb-2 max-w-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
              {message.mediaType === 'video' && (
                <div className="bg-gray-100 rounded-lg p-3 mb-2 flex items-center gap-2 text-gray-600">
                  <span className="text-2xl">🎥</span>
                  <span className="text-xs">Vídeo</span>
                </div>
              )}
              {message.mediaType === 'audio' && (
                <div className="bg-gray-100 rounded-lg p-3 mb-2 flex items-center gap-2 text-gray-600">
                  <span className="text-2xl">🎵</span>
                  <span className="text-xs">Áudio</span>
                </div>
              )}
              {message.mediaType === 'document' && (
                <div className="bg-gray-100 rounded-lg p-3 mb-2 flex items-center gap-2 text-gray-600">
                  <span className="text-2xl">📄</span>
                  <span className="text-xs">{message.content}</span>
                </div>
              )}
              {(!message.mediaType || message.mediaType !== 'document') && (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              )}
              <p className={`text-[10px] mt-1 ${message.type === 'user' ? 'text-brand-secondary/70' : 'text-gray-400'}`}>
                {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white relative">
        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute bottom-20 right-4 z-50">
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}

        {flowEnded ? (
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-2">Fluxo concluído</p>
            <button onClick={handleRestart} className="px-4 py-2 bg-brand-primary text-white rounded-xl text-sm hover:bg-brand-primary/90 transition-colors w-full">
              🔄 Reiniciar Preview
            </button>
          </div>
        ) : (
          <>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="px-3 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
                title="Adicionar emoji"
              >
                <span className="text-xl">😀</span>
              </button>
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem..."
                disabled={isProcessing}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={!userInput.trim() || isProcessing}
                className="px-4 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">Pressione Enter para enviar</p>
          </>
        )}
      </div>
    </aside>
  );
}
