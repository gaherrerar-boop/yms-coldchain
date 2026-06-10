/**
 * Global Notifications Module
 * Maneja alertas y mensajes en toda la aplicación
 */

export function showAlert(message, type = 'info') {
  const logType = type === 'error' ? 'error' : type === 'success' ? 'log' : 'log';
  console[logType](`[YMS Alert] ${message}`);

  // Mostrar en elemento del DOM si existe
  const loginErr = document.getElementById('login-err');
  if (loginErr && (type === 'error' || type === 'warn')) {
    loginErr.textContent = message;
    loginErr.style.display = 'block';
  }

  // Mostrar en popup de alerta si existe
  const alertPopup = document.getElementById('alert-popup');
  if (alertPopup && window.showAlert_UI) {
    window.showAlert_UI(message, type);
  }
}

export function showError(message) {
  showAlert(message, 'error');
}

export function showSuccess(message) {
  showAlert(message, 'success');
}

export function showToast(message, type = 'info') {
  showAlert(message, type);
}
