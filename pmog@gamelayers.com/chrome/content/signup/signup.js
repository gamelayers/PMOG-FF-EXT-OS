function tnnSignup() {
  var throb = document.getElementById('throbber');
  if (initialFormValidate()) {
    var contents = {};
    contents.user = {};
    contents.user.login = document.getElementById('login').value;
    contents.user.password = document.getElementById('password').value;
    contents.user.signup_version = opener.Pmog.version;
    contents.user.signup_source = "extension";
    
    if (document.getElementById('email').value !== "") {
      contents.user.email = document.getElementById('email').value;
    }
    
    contents.user_secret = {};
    contents.user_secret.secret_question_id = document.getElementById('secret_question_id').selectedItem.value;
    contents.user_secret.answer = document.getElementById('answer').value;
    
    contents.captcha_id = document.getElementById('captcha_id').value;
    contents.captcha_answer = document.getElementById('captcha_answer').value;

    var jsonUser = opener.jQuery.toJSON(contents);
    
    // opener.Pmog.logger.debug(opener.toJSONString(jsonUser));
    
    var dialog = this;
    
    opener.jQuery.ajax({
      url: opener.Pmog.BASE_URL + "/users.json",
      type: 'POST',
      dataType: 'json',
      contentType: "application/json; charset=utf-8",
      data: jsonUser,
      success: function(data, statusText) {
        // opener.Pmog.logger.debug(opener.toJSONString(data));
        data.user.password = contents.user.password;
        opener.Pmog.hud.session_manager.process_login(data);
        opener.Pmog.hud.openAndReuseOneTabPerURL(opener.Pmog.BASE_URL + "/users/" + opener.Pmog.user.login);
        dialog.close();
      },
      error: function(data, statusText, errorObject) {
        try {
          var resp = opener.jQuery.evalJSON(data.responseText);
          // opener.Pmog.logger.debug(opener.toJSONString(resp));
        } catch(e) {
          // opener.Pmog.logger.error("Error responding to signup error");
          Components.utils.reportError(e);
        }
        
        for (var i = resp.errors.length - 1; i >= 0; i--){
          try {
            opener.jQuery("#" + resp.errors[i][0], document.childNodes).addClass("error");
            var errorLabel = document.getElementById(resp.errors[i][0] + "_error");
            errorLabel.value = resp.errors[i][0] + " " + resp.errors[i][1];
            errorLabel.hidden = false;
          } catch(e) {
            // opener.Pmog.logger.error(e);
            Components.utils.reportError(e);
          }
        }
        window.sizeToContent();
      },
      beforeSend: function() {
        opener.jQuery(".error_label", document.childNodes).each(function() { this.hidden = true; });
        opener.jQuery("textbox.error", document.childNodes).removeClass("error");
        throb.hidden = false;
      },
      complete: function() {
        throb.hidden = true;
      }
    });
  } else {
    // opener.Pmog.logger.debug('Not valid yet');
    throw("Not valid yet");
  }
}

function cancelSignup() {
  this.cancelDialog();
}

function initialFormValidate() {
  var valid = false;
  if (document.getElementById('login').value !== "" && document.getElementById('password').value !== ""
                                                   && document.getElementById('answer').value !== "") {
    valid = true;
  }
  
  return valid;
}

function loadSignupForm() {
  var acceptButton = document.documentElement.getButton("extra1");
  var tosLink = document.getElementById('tosLink');
  acceptButton.disabled = true;
  tosLink.setAttribute("href", opener.Pmog.BASE_URL + '/guide/rules/terms');
  
  var captchaLoaded = loadSignup();
  
}

function tosCheckboxListener() {
  var chkbx = document.getElementById('tosChkbx');
  var acceptButton = document.documentElement.getButton("extra1");
  if (chkbx.checked && initialFormValidate()) {
    acceptButton.disabled = false;
  } else {
    acceptButton.disabled = true;
  }
}

function openTos() {
  opener.Pmog.hud.openAndReuseOneTabPerURL(opener.Pmog.BASE_URL + "/guide/rules/terms");
}

function loadSignup() {
  opener.jQuery.getJSON(opener.Pmog.BASE_URL + "/users/new.json",
   function(json){
      document.getElementById('captcha_question').value = json.captcha.question;
      document.getElementById('captcha_id').value = json.captcha.id;
      
      var list = document.getElementById('secret_question_id');
      for (var i=0; i < json.secret_questions.length; i++) {
        list.appendItem(json.secret_questions[i].question, json.secret_questions[i].id);
      }
      list.removeItemAt(0);
      list.selectedIndex = 0;
      
      window.sizeToContent();
  });
  
  return true;
  
}

function twitterLogin() {
  opener.Pmog.hud.openAndReuseOneTabPerURL(opener.Pmog.BASE_URL + "/oauth/new/twitter");
  this.close();
}