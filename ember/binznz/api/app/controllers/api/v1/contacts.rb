module API
  module V1
    class Contacts < Grape::API
      resource :contacts do
        desc "Return all contacts"
        get "", root: :contacts do
          Contact.all
        end

        desc "Return a contact"
        get ":id", root: "contact" do
          Contact.where(id: permitted_params[:id]).first!
        end
      end
    end
  end
end
