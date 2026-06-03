import React, { useState, useRef, useEffect } from 'react';
import { FiMessageSquare, FiImage, FiVideo, FiMic, FiFileText, FiClock, FiChevronDown } from 'react-icons/fi';

interface MessageTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  excludeOptions?: string[];
}

const messageTypes = [
  { value: 'text', label: 'Texto', icon: <FiMessageSquare className="w-4 h-4 text-gray-500" /> },
  { value: 'image', label: 'Imagem', icon: <FiImage className="w-4 h-4 text-blue-500" /> },
  { value: 'video', label: 'Vídeo', icon: <FiVideo className="w-4 h-4 text-purple-500" /> },
  { value: 'audio', label: 'Áudio', icon: <FiMic className="w-4 h-4 text-indigo-500" /> },
  { value: 'document', label: 'Arquivo', icon: <FiFileText className="w-4 h-4 text-orange-500" /> },
  { 
    value: 'openai', 
    label: 'OpenAI', 
    icon: <img src="https://www.google.com/s2/favicons?domain=openai.com&sz=64" alt="OpenAI" className="w-4 h-4 object-contain rounded-sm" /> 
  },
  { 
    value: 'groq', 
    label: 'Groq AI', 
    icon: <img src="https://www.google.com/s2/favicons?domain=groq.com&sz=64" alt="Groq" className="w-4 h-4 object-contain rounded-sm" /> 
  },
  { value: 'wait', label: 'Espera', icon: <FiClock className="w-4 h-4 text-gray-600" /> },
];

export const MessageTypeSelect: React.FC<MessageTypeSelectProps> = ({ value, onChange, className = '', excludeOptions = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = messageTypes.filter(t => !excludeOptions.includes(t.value));
  const selectedType = filteredOptions.find(t => t.value === value) || filteredOptions[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left flex items-center justify-between transition-colors hover:bg-gray-50 ${className}`}
      >
        <div className="flex items-center gap-2">
          {selectedType.icon}
          <span className="text-sm font-medium text-gray-700">{selectedType.label}</span>
        </div>
        <FiChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden py-1 max-h-60 overflow-y-auto">
          {filteredOptions.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => {
                onChange(type.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-blue-50 transition-colors ${
                value === type.value ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center justify-center w-6 h-6 bg-white rounded shadow-sm border border-gray-100">
                {type.icon}
              </div>
              <span className={`text-sm ${value === type.value ? 'font-semibold text-blue-700' : 'text-gray-700'}`}>
                {type.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
