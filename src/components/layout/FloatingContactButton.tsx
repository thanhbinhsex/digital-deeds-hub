import { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface ContactSettings {
  telegram_url?: string;
  zalo_url?: string;
}

export function FloatingContactButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [contacts, setContacts] = useState<ContactSettings>({
    telegram_url: 'https://t.me/vietool',
    zalo_url: 'https://zalo.me/vietool',
  });

  useEffect(() => {
    const fetchContacts = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'contact')
        .single();
      if (data?.value) {
        setContacts(data.value as ContactSettings);
      }
    };
    fetchContacts();
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Contact Options */}
      <div
        className={cn(
          'flex flex-col gap-2 transition-all duration-300',
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        )}
      >
        {/* Telegram */}
        {contacts.telegram_url && (
          <a
            href={contacts.telegram_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 bg-[#0088cc] text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            <span className="font-medium">Telegram</span>
          </a>
        )}

        {/* Zalo */}
        {contacts.zalo_url && (
          <a
            href={contacts.zalo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 bg-[#0068ff] text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
          >
            <svg className="h-5 w-5" viewBox="0 0 48 48" fill="currentColor">
              <path d="M24 4C12.954 4 4 12.954 4 24c0 5.886 2.545 11.186 6.593 14.848V44l4.987-2.736A21.898 21.898 0 0024 44c11.046 0 20-8.954 20-20S35.046 4 24 4zm2.293 26.889l-5.115-5.461-9.99 5.461L22.032 19.1l5.232 5.461 9.873-5.461-10.844 11.789z"/>
            </svg>
            <span className="font-medium">Zalo</span>
          </a>
        )}
      </div>

      {/* Main Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110',
          'bg-gradient-to-br from-[#a855f7] via-[#ec4899] to-[#f43f5e]',
          isOpen && 'rotate-90'
        )}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageCircle className="h-6 w-6 text-white" />
        )}
      </button>
    </div>
  );
}
