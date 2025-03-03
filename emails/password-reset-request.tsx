/* eslint-disable @next/next/no-img-element */
import * as React from 'react';
import EmailTemplate from './EmailTemplate';

const PasswordResetRequestEmail = ({
  name,
  resetLink,
}: {
  name: string;
  resetLink: string;
}) => {
  return (
    <EmailTemplate
      title="Solicitud para restablecer la contraseña de su cuenta"
      heading="Restablecer contraseña"
      name={name}
      buttonText="Restablecer contraseña"
      buttonHref={resetLink}
    >
      Hemos recibido una solicitud para restablecer tu contraseña en{' '}
      <span className="font-semibold">Impromec Calculador.</span> Haz clic en el
      siguiente enlace para crear una nueva contraseña.
    </EmailTemplate>
  );
};

export default PasswordResetRequestEmail;
