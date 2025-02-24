/* eslint-disable @next/next/no-img-element */
import * as React from 'react';
import EmailTemplate from './EmailTemplate';

const ConfirmAccountEmail = ({
  name,
  verificationLink,
}: {
  name: string;
  verificationLink: string;
}) => {
  return (
    <EmailTemplate
      title="Confirme su dirección de correo electrónico"
      heading="Confirma tu cuenta"
      name={name}
      buttonText="Confirmar registro"
      buttonHref={verificationLink}
    >
      Acabas de crear una cuenta en{' '}
      <span className="font-semibold">Impromec Calculador.</span> Confirma tu
      dirección de correo electrónico para que que podamos verificar que
      realmente eres tú.
    </EmailTemplate>
  );
};

export default ConfirmAccountEmail;
