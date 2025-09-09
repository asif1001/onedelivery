// Email templates for complaint notifications
export interface ComplaintEmailData {
  complaintId: string;
  title: string;
  status: string;
  priority?: string;
  userName: string;
  branchName?: string;
  description?: string;
  updateType: 'status_change' | 'comment_added' | 'document_uploaded' | 'resolved';
  updateDetails?: string;
  adminComment?: string;
}

export const generateComplaintUpdateEmailHTML = (data: ComplaintEmailData): string => {
  const statusColors = {
    'open': '#ef4444',
    'in-progress': '#3b82f6', 
    'resolved': '#10b981',
    'closed': '#6b7280'
  };

  const priorityColors = {
    'high': '#dc2626',
    'medium': '#f59e0b',
    'low': '#16a34a'
  };

  const getUpdateMessage = () => {
    switch (data.updateType) {
      case 'status_change':
        return `Your complaint status has been updated to <strong>${data.status.toUpperCase()}</strong>`;
      case 'comment_added':
        return 'A new comment has been added to your complaint';
      case 'document_uploaded':
        return 'New documents have been uploaded to your complaint';
      case 'resolved':
        return 'Your complaint has been resolved!';
      default:
        return 'Your complaint has been updated';
    }
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Complaint Update - OneDelivery</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .complaint-card { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${statusColors[data.status as keyof typeof statusColors] || '#6b7280'}; }
        .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; color: white; font-size: 12px; font-weight: bold; margin: 10px 0; background-color: ${statusColors[data.status as keyof typeof statusColors] || '#6b7280'}; }
        .priority-badge { display: inline-block; padding: 4px 8px; border-radius: 12px; color: white; font-size: 10px; font-weight: bold; margin-left: 8px; background-color: ${priorityColors[data.priority as keyof typeof priorityColors] || '#6b7280'}; }
        .update-message { font-size: 18px; color: #2c3e50; margin: 20px 0; }
        .details { background-color: #e3f2fd; border-radius: 6px; padding: 15px; margin: 15px 0; }
        .footer { background-color: #2c3e50; color: white; padding: 20px; text-align: center; font-size: 12px; }
        .button { display: inline-block; background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .icon { width: 20px; height: 20px; vertical-align: middle; margin-right: 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛢️ OneDelivery</h1>
          <h2>Complaint Update Notification</h2>
        </div>
        
        <div class="content">
          <p>Hello <strong>${data.userName}</strong>,</p>
          
          <div class="update-message">
            📢 ${getUpdateMessage()}
          </div>

          <div class="complaint-card">
            <h3>Complaint Details</h3>
            <p><strong>ID:</strong> #${data.complaintId.slice(-8).toUpperCase()}</p>
            <p><strong>Title:</strong> ${data.title}</p>
            ${data.branchName ? `<p><strong>Branch:</strong> ${data.branchName}</p>` : ''}
            
            <div>
              <span class="status-badge">${data.status.replace('-', ' ').toUpperCase()}</span>
              ${data.priority ? `<span class="priority-badge">${data.priority.toUpperCase()} PRIORITY</span>` : ''}
            </div>
            
            ${data.description ? `<p><strong>Description:</strong> ${data.description}</p>` : ''}
          </div>

          ${data.updateDetails ? `
            <div class="details">
              <h4>Update Details:</h4>
              <p>${data.updateDetails}</p>
            </div>
          ` : ''}

          ${data.adminComment ? `
            <div class="details">
              <h4>Administrator Comment:</h4>
              <p>"${data.adminComment}"</p>
            </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NODE_ENV === 'production' ? 'https://your-domain.com' : 'http://localhost:5000'}/complaint-management" class="button">
              View Full Details
            </a>
          </div>

          <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 14px;">
            <p><strong>What's Next?</strong></p>
            ${data.status === 'resolved' ? 
              '<p>✅ Your complaint has been resolved. If you have any further questions, please feel free to contact us.</p>' : 
              '<p>📝 We will continue working on your complaint and update you on any progress.</p>'
            }
          </div>
        </div>

        <div class="footer">
          <p><strong>OneDelivery Oil Management System</strong></p>
          <p>This is an automated notification. Please do not reply to this email.</p>
          <p>If you need assistance, please contact our support team.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const generateComplaintUpdateEmailText = (data: ComplaintEmailData): string => {
  const getUpdateMessage = () => {
    switch (data.updateType) {
      case 'status_change':
        return `Your complaint status has been updated to ${data.status.toUpperCase()}`;
      case 'comment_added':
        return 'A new comment has been added to your complaint';
      case 'document_uploaded':
        return 'New documents have been uploaded to your complaint';
      case 'resolved':
        return 'Your complaint has been resolved!';
      default:
        return 'Your complaint has been updated';
    }
  };

  return `
OneDelivery - Complaint Update Notification

Hello ${data.userName},

${getUpdateMessage()}

COMPLAINT DETAILS:
- ID: #${data.complaintId.slice(-8).toUpperCase()}
- Title: ${data.title}
- Status: ${data.status.replace('-', ' ').toUpperCase()}
${data.priority ? `- Priority: ${data.priority.toUpperCase()}` : ''}
${data.branchName ? `- Branch: ${data.branchName}` : ''}
${data.description ? `- Description: ${data.description}` : ''}

${data.updateDetails ? `UPDATE DETAILS:\n${data.updateDetails}\n` : ''}

${data.adminComment ? `ADMINISTRATOR COMMENT:\n"${data.adminComment}"\n` : ''}

View full details: ${process.env.NODE_ENV === 'production' ? 'https://your-domain.com' : 'http://localhost:5000'}/complaint-management

${data.status === 'resolved' ? 
  'Your complaint has been resolved. If you have any further questions, please feel free to contact us.' : 
  'We will continue working on your complaint and update you on any progress.'
}

---
OneDelivery Oil Management System
This is an automated notification. Please do not reply to this email.
`;
};