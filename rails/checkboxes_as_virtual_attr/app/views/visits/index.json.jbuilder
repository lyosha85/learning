json.array!(@visits) do |visit|
  json.extract! visit, :id, :visit_reason
  json.url visit_url(visit, format: :json)
end
