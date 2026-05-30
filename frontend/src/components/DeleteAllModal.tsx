import { useState } from 'react';
import { api } from '../services/api';
import { toast } from 'react-hot-toast';

interface DeleteAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  totalContacts: number;
}

export function DeleteAllModal({ isOpen, onClose, onSuccess, totalContacts }: DeleteAllModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (confirmText !== 'EXCLUIR') {
      toast.error('Digite EXCLUIR para confirmar');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.deleteAllContacts();
      toast.success(response.message || 'Contatos excluídos com sucesso');
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao excluir todos os contatos:', error);
      toast.error(error.message || 'Erro ao excluir contatos');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4 text-red-600">
          ⚠️ ATENÇÃO: Excluir Todos os Contatos
        </h2>

        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-sm text-red-800 font-medium">
            Você está prestes a excluir TODOS os {totalContacts} contatos da sua base de dados.
          </p>
          <p className="text-sm text-red-800 mt-2">
            Esta ação é irreversível e apagará o histórico associado a estes contatos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Para continuar, digite <strong>EXCLUIR</strong> no campo abaixo:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="EXCLUIR"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || confirmText !== 'EXCLUIR'}
              className="flex-1 px-4 py-2 rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Excluindo...' : 'Limpar Base'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
