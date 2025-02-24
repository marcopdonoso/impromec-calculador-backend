/* eslint-disable @next/next/no-img-element */
import * as React from 'react';
import EmailTemplate from './EmailTemplate';

const PasswordResetSuccessEmail = ({ name, verificationLink }) => {
  return (
    <EmailTemplate
      title="La contraseña de su cuenta se ha actualizado."
      heading="Contraseña actualizada"
      name={name}
      buttonText="Iniciar sesión"
      buttonHref={verificationLink}
    >
      La contraseña de tu cuenta en{' '}
      <span className="font-semibold">Impromec Calculador.</span> se ha
      actualizado con éxito.
    </EmailTemplate>
  );
};

export default PasswordResetSuccessEmail;
