const data =  [
    {
      title: "Call Blocked",
      subtitle: "Incoming call blocked",
      icon: "🚫",
      body: "A call from this number was blocked.",
      actionLabel: "Cancel",
      callBlocked: true,
      securityAlert: true,
      securityText: "Potential scam call detected. Do not share personal info.",
    },
    {
      title: "Security Alert",
      subtitle: "Incoming call blocked",
      icon: "⚠️",
      body: "A call from this number was blocked.",
      actionLabel: "Cancel",
      callBlocked: true,
      securityAlert: true,
      securityText: "Potential scam call detected. Do not share personal info.",
    },
    {
      title: "Contact Support",
      subtitle: "Call Support team",
      icon: "📞",
      body: "For assistance contact us",
      actionLabel: "Cancel",
      callBlocked: true,
      securityAlert: true,
      securityText: "Potential scam call detected. Do not share personal info.",
    },
]

const phoneNumber = "+1234567890"

export  {
    data, phoneNumber
}