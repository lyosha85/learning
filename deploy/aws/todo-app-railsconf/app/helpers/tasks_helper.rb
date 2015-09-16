module TasksHelper
  def badge_for(task, prefix)
    case task.state
    when "TODO"
      prefix + "warning"
    when "WIP"
      prefix + "info"
    when "DONE"
      prefix + "success"
    when "CANCELED"
      prefix + "danger"
    else
      ""
    end
  end
end
