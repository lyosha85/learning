class ApplicationMailer < ActionMailer::Base
  default from: "from@example.com", to: "lyosha85dev@gmail.com "
  layout 'mailer'

  def durmail
    mail(subject: "durmail arrived!")
  end
end
