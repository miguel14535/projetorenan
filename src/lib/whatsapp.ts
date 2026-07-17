export interface WhatsAppAppointment {
  title: string;
  description?: string | null;
  appointment_date: string;
  appointment_time?: string | null;
  person?: { name: string } | null;
}

/**
 * Monta a mensagem de lembrete de um ou mais compromissos.
 */
export function buildAppointmentMessage(appointments: WhatsAppAppointment[]): string {
  let message = appointments.length > 1
    ? '*Lembrete de Compromissos*\n\n'
    : '*Lembrete de Compromisso*\n\n';

  appointments.forEach((apt, index) => {
    const prefix = appointments.length > 1 ? `${index + 1}. ` : '';
    message += `${prefix}*${apt.title}*\n`;

    const dateFormatted = new Date(`${apt.appointment_date}T00:00:00`).toLocaleDateString('pt-BR');
    message += `Data: ${dateFormatted}\n`;

    if (apt.appointment_time) {
      message += `Horario: ${apt.appointment_time}\n`;
    }
    if (apt.description) {
      message += `${apt.description}\n`;
    }
    if (apt.person?.name) {
      message += `Pessoa: ${apt.person.name}\n`;
    }
    message += '\n';
  });

  message += '_Enviado via FinanceFlow_';
  return message;
}

/**
 * Abre o WhatsApp (app no celular ou WhatsApp Web no computador) com o
 * numero e a mensagem ja preenchidos, prontos para o usuario apertar enviar.
 * Nao depende de nenhuma API key nem de servidor: funciona sempre.
 */
export function sendWhatsAppMessage(phone: string | null | undefined, message: string): boolean {
  if (!phone) {
    return false;
  }

  // Mantem apenas digitos. Se nao tiver DDI (codigo do pais), assume Brasil (55).
  let digits = phone.replace(/\D/g, '');
  if (digits.length <= 11) {
    digits = `55${digits}`;
  }

  const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
