#encoding: utf-8

After do |scenario|
  if scenario.failed?
    save_page
  end
end

Before do
  delete_database backend_url('audiobooks')
end
