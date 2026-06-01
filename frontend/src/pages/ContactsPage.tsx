import { useState } from 'react';
import { useContacts } from '../hooks/useContacts';
import { ContactList } from '../components/ContactList';
import { ContactForm } from '../components/ContactForm';
import { CategoryModal } from '../components/CategoryModal';
import { CSVImportModal } from '../components/CSVImportModal';
import { BulkEditModal } from '../components/BulkEditModal';
import { DeleteAllModal } from '../components/DeleteAllModal';
import { ChatwootSyncModal } from '../components/ChatwootSyncModal';
import { PerfexImportModal } from '../components/PerfexImportModal';
import { SearchAndFilters } from '../components/SearchAndFilters';
import { Pagination } from '../components/Pagination';
import { Header } from '../components/Header';
import { Contact } from '../types';

export function ContactsPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>();
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isCSVImportModalOpen, setIsCSVImportModalOpen] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [isChatwootSyncModalOpen, setIsChatwootSyncModalOpen] = useState(false);
  const [isPerfexImportModalOpen, setIsPerfexImportModalOpen] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const pageSize = 30;

  const { contacts, total, totalPages, loading, error, refresh, deleteContact } = useContacts({
    search: search || undefined,
    tag: selectedCategory || undefined,
    page: currentPage,
    pageSize,
  });

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
    setCurrentPage(1);
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingContact(undefined);
    refresh();
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingContact(undefined);
  };

  const handleNewContact = () => {
    setEditingContact(undefined);
    setIsFormOpen(true);
  };

  const handleOpenCategoryModal = () => {
    setIsCategoryModalOpen(true);
  };

  const handleCloseCategoryModal = () => {
    setIsCategoryModalOpen(false);
  };

  const handleOpenCSVImportModal = () => {
    setIsCSVImportModalOpen(true);
  };

  const handleCloseCSVImportModal = () => {
    setIsCSVImportModalOpen(false);
  };

  const handleCSVImportSuccess = () => {
    refresh();
    setIsCSVImportModalOpen(false);
  };

  const handleToggleSelectContact = (contactId: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleSelectAllContacts = () => {
    if (selectedContactIds.length === contacts.length) {
      setSelectedContactIds([]);
    } else {
      setSelectedContactIds(contacts.map((c) => c.id));
    }
  };

  const handleOpenBulkEdit = () => {
    setIsBulkEditModalOpen(true);
  };

  const handleCloseBulkEdit = () => {
    setIsBulkEditModalOpen(false);
  };

  const handleBulkEditSuccess = () => {
    setSelectedContactIds([]);
    setIsBulkEditModalOpen(false);
    refresh();
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erro</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="btn-primary"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header
        title="Contatos"
        subtitle={
          selectedContactIds.length > 0
            ? `${selectedContactIds.length} contato(s) selecionado(s)`
            : `${total} contatos cadastrados`
        }
        actions={
          <div className="flex gap-3">
            {selectedContactIds.length > 0 ? (
              <>
                <button
                  onClick={handleOpenBulkEdit}
                  className="btn-primary"
                  aria-label="Editar contatos selecionados"
                >
                  Editar Selecionados ({selectedContactIds.length})
                </button>
                <button
                  onClick={() => setSelectedContactIds([])}
                  className="btn-secondary"
                  aria-label="Cancelar seleção"
                >
                  Cancelar Seleção
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleOpenCategoryModal}
                  className="btn-primary"
                  aria-label="Gerenciar categorias"
                >
                  Categorias
                </button>
                <button
                  onClick={handleNewContact}
                  className="btn-primary"
                  aria-label="Criar novo contato"
                >
                  + Novo Contato
                </button>
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="px-4 py-2 text-gray-800 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 text-xl font-bold transition-colors"
                    aria-label="Menu de opções"
                  >
                    ⋮
                  </button>
                  {isMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10 bg-black/5"
                        onClick={() => setIsMenuOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                        <button
                          onClick={() => {
                            handleOpenCSVImportModal();
                            setIsMenuOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                        >
                          <span>📄</span>
                          <span>Importar CSV</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsChatwootSyncModalOpen(true);
                            setIsMenuOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                        >
                          <span>💬</span>
                          <span>Chatwoot</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsPerfexImportModalOpen(true);
                            setIsMenuOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                        >
                          <span>🔧</span>
                          <span>Perfex CRM</span>
                        </button>
                        <div className="border-t border-gray-100 my-1"></div>
                        <button
                          onClick={() => {
                            setIsDeleteAllModalOpen(true);
                            setIsMenuOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                        >
                          <span>🗑️</span>
                          <span>Excluir Todos</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-6">

        <SearchAndFilters
          search={search}
          selectedCategory={selectedCategory}
          onSearchChange={handleSearchChange}
          onCategoryChange={handleCategoryChange}
          onClearFilters={handleClearFilters}
        />

        {contacts.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleSelectAllContacts}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium underline"
            >
              {selectedContactIds.length === contacts.length ? 'Desmarcar todos' : 'Selecionar todos'}
            </button>
            {selectedContactIds.length > 0 && (
              <span className="text-sm text-gray-600">
                {selectedContactIds.length} de {contacts.length} selecionados nesta página
              </span>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <ContactList
            contacts={contacts}
            loading={loading}
            onEdit={handleEdit}
            onDelete={deleteContact}
            selectedContactIds={selectedContactIds}
            onToggleSelect={handleToggleSelectContact}
            onSelectAll={handleSelectAllContacts}
            selectionMode={true}
          />
        </div>

        {totalPages > 1 && (
          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}

        <div className="text-center text-sm text-gray-500">
          Mostrando {contacts.length} de {total} contatos
        </div>
      </div>

      {isFormOpen && (
        <ContactForm
          contact={editingContact}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      )}

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={handleCloseCategoryModal}
      />

      <CSVImportModal
        isOpen={isCSVImportModalOpen}
        onClose={handleCloseCSVImportModal}
        onSuccess={handleCSVImportSuccess}
      />

      <BulkEditModal
        isOpen={isBulkEditModalOpen}
        onClose={handleCloseBulkEdit}
        selectedContactIds={selectedContactIds}
        onSuccess={handleBulkEditSuccess}
      />

      <ChatwootSyncModal
        isOpen={isChatwootSyncModalOpen}
        onClose={() => setIsChatwootSyncModalOpen(false)}
        onSuccess={() => {
          refresh();
          setIsChatwootSyncModalOpen(false);
        }}
      />

      <PerfexImportModal
        isOpen={isPerfexImportModalOpen}
        onClose={() => setIsPerfexImportModalOpen(false)}
        onSuccess={() => {
          refresh();
          setIsPerfexImportModalOpen(false);
        }}
      />

      <DeleteAllModal
        isOpen={isDeleteAllModalOpen}
        onClose={() => setIsDeleteAllModalOpen(false)}
        onSuccess={() => {
          setIsDeleteAllModalOpen(false);
          refresh();
        }}
        totalContacts={total}
      />
    </>
  );
}