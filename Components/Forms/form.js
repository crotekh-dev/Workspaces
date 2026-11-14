document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".workspace-form").forEach((form) => {
    const submitButton = form.querySelector(".submit-btn");
    const status = form.querySelector(".form-status");

    const fileLabel = form.querySelector(".attachment-label");
    const originalButtonText = submitButton?.textContent.trim() || "Submit";
    let isSubmitting = false;

    const showStatus = (message, type) => {
      status.textContent = message;
      status.className = `form-status ${type}`;
      status.hidden = false;
    };

    const clearStatus = () => {
      status.hidden = true;
      status.textContent = "";
      status.className = "form-status";
    };

    // Keep the selected filename visible and validate before sending.
    fileInput?.addEventListener("change", () => {
      clearStatus();
      const file = fileInput.files?.[0];
      if (!file) {
        fileLabel.textContent = "Choose a file";
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        fileInput.value = "";
        fileLabel.textContent = "Choose a file";
        showStatus(
          "That file is larger than 5 MB. Please choose a smaller file.",
          "error",
        );
        return;
      }
      fileLabel.textContent = file.name;
    });

    form.addEventListener("input", clearStatus);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (isSubmitting) return;

      // Use native browser validation while retaining the page and its styling.
      if (!form.reportValidity()) return;

      const selectedFile = fileInput?.files?.[0];
      if (selectedFile && selectedFile.size > MAX_FILE_SIZE) {
        showStatus(
          "That file is larger than 5 MB. Please choose a smaller file.",
          "error",
        );
        return;
      }

      const accessKey = form.querySelector('input[name="access_key"]')?.value;
      if (!accessKey) {
        showStatus(
          "This form is not configured correctly. Please try again later.",
          "error",
        );
        return;
      }

      isSubmitting = true;
      submitButton.disabled = true;
      submitButton.setAttribute("aria-busy", "true");
      submitButton.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Sending...';
      submitButton.classList.add("is-loading");
      clearStatus();

      try {
        const response = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { Accept: "application/json" },
          body: new FormData(form),
        });

        let result;
        try {
          result = await response.json();
        } catch {
          throw new Error(
            "The server returned an unreadable response. Please try again.",
          );
        }

        const succeeded = response.ok && result.success === true;
        if (!succeeded) {
          const message =
            result.message || result.error || result.body?.message;
          throw new Error(
            message ||
              `We couldn't send your message (error ${response.status}). Please try again.`,
          );
        }

        form.reset();
        if (fileLabel) fileLabel.textContent = "Choose a file";
        showStatus(
          "Your message has been sent successfully. Thank you for helping improve Workspaces!",
          "success",
        );
      } catch (error) {
        showStatus(
          error.message ||
            "Something went wrong while sending your message. Check your connection and try again.",
          "error",
        );
      } finally {
        isSubmitting = false;
        submitButton.disabled = false;
        submitButton.removeAttribute("aria-busy");
        submitButton.classList.remove("is-loading");
        submitButton.textContent = originalButtonText;
      }
    });
  });
});
