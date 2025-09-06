
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import { TestingCard } from "@/api/entities";
import { TestComment } from "@/api/entities";
import { Project } from "@/api/entities";
import { User } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Upload, Check, MessageSquare, ImageIcon, X, Plus } from "lucide-react";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";

export default function TestCardDetails() {
  const [card, setCard] = useState(null);
  const [project, setProject] = useState(null);
  const [user, setUser] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false); // New state for image upload section
  const fileInputRef = useRef(null);

  const location = useLocation();
  const cardId = new URLSearchParams(location.search).get("id");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cardData, userData, allProjectsForUser] = await Promise.all([
        TestingCard.filter({ id: cardId }),
        User.me(),
        Project.list('-created_date')
      ]);

      if (cardData.length > 0) {
        const currentCard = cardData[0];
        setCard(currentCard);

        const targetProject = allProjectsForUser.find((p) => p.id === currentCard.project_id);
        setProject(targetProject || null);
      }
      setUser(userData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  }, [cardId]); // cardId is a dependency because it's used inside loadData

  const loadComments = useCallback(async () => {
    try {
      const commentsData = await TestComment.filter({ testing_card_id: cardId }, 'created_date');
      setComments(commentsData);
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  }, [cardId]); // cardId is a dependency because it's used inside loadComments

  useEffect(() => {
    if (cardId) {
      loadData();
      loadComments();
    }
  }, [cardId, loadData, loadComments]); // loadData and loadComments are now stable because of useCallback

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map((file) => UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const imageUrls = results.map((result) => result.file_url);
      setUploadedImages((prev) => [...prev, ...imageUrls]);
    } catch (error) {
      console.error("Error uploading images:", error);
    }
    setUploading(false);
    // Clear the input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (indexToRemove) => {
    setUploadedImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleCommentSubmit = async () => {
    if (!newComment.trim() && uploadedImages.length === 0) return;

    setCommenting(true);
    try {
      await TestComment.create({
        testing_card_id: cardId,
        user_id: user.id,
        user_name: `${user.first_name} ${user.last_name}`,
        comment_text: newComment,
        image_urls: uploadedImages
      });

      setNewComment('');
      setUploadedImages([]);
      setShowImageUpload(false); // Hide upload section after commenting
      await loadComments();
    } catch (error) {
      console.error("Error submitting comment:", error);
    }
    setCommenting(false);
  };

  const handleSignOff = async (isChecked) => {
    if (!isChecked) return;

    try {
      const updatedCard = await TestingCard.update(card.id, {
        is_signed_off: true,
        signed_off_date: new Date().toISOString(),
        signed_off_by: user.id,
        signed_off_by_name: `${user.first_name} ${user.last_name}`
      });
      setCard(updatedCard);
    } catch (error) {
      console.error("Error signing off:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>);

  }

  if (!card) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-center">
        <div>
          <h2 className="text-xl font-bold">Test card not found</h2>
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="link">Go back to Dashboard</Button>
          </Link>
        </div>
      </div>);

  }

  // Prepare steps for timeline checkboxes
  const steps = card.steps_to_reproduce ? card.steps_to_reproduce.split('\n').filter((step) => step.trim() !== '') : [];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl(`ClientProjectView?id=${project?.id}`)}>
            <Button
              variant="outline"
              size="icon"
              className="bg-white text-black border border-gray-300 hover:bg-gray-100"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Testing Details</h1>
            <p className="text-muted-foreground">Review and provide feedback</p>
          </div>
        </div>

        {/* Test Item Header */}
        <Card className="mb-6 border-0 shadow-xl bg-white">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-3xl mb-2">{card.title}</CardTitle>
                <p className="text-slate-600 text-lg leading-relaxed">{card.description}</p>

                <div className="flex items-center gap-4 mt-4">
                  {card.is_signed_off ?
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      <Check className="w-3 h-3 mr-1" />
                      Signed Off
                    </Badge> :

                    <Badge variant="outline">
                      Pending Review
                    </Badge>
                  }

                  <Badge variant="outline" className="text-slate-600">
                    {comments.length} Comment{comments.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>

          {/* Reference Images - Now displayed below description */}
          {((card.reference_image_urls && card.reference_image_urls.length > 0) || card.reference_image_url) && (
            <CardContent className="pt-0">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Reference Images</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {card.reference_image_urls && card.reference_image_urls.length > 0 ? (
                    card.reference_image_urls.map((imageUrl, index) => (
                      <div key={index} className="border rounded-lg overflow-hidden bg-slate-50">
                        <img
                          src={imageUrl}
                          alt={`Reference ${index + 1}`}
                          className="w-full h-32 object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    ))
                  ) : card.reference_image_url && (
                    <div className="border rounded-lg overflow-hidden bg-slate-50">
                      <img
                        src={card.reference_image_url}
                        alt="Reference"
                        className="w-full h-32 object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          )}

          {/* Timeline Checkboxes */}
          {steps.length > 0 &&
            <CardContent className={((card.reference_image_urls && card.reference_image_urls.length > 0) || card.reference_image_url) ? "pt-4" : "pt-0"}>
              <h4 className="font-medium text-slate-900 mb-3">Steps to Reproduce</h4>
              <div className="space-y-2">
                {steps.map((step, index) =>
                  <div key={index} className="flex items-center space-x-2">
                    <Checkbox
                      id={`step-${index}`}
                      checked={card.is_signed_off}
                      disabled
                    />
                    <Label htmlFor={`step-${index}`} className="text-slate-700">
                      {step.trim()}
                    </Label>
                  </div>
                )}
              </div>
            </CardContent>
          }

          {/* Sign-off Section */}
          {card.is_signed_off ?
            <CardContent className="pt-4">
              <div className="flex items-center gap-3 p-3 bg-green-50 text-green-800 rounded-lg">
                <Check className="w-5 h-5" />
                <div>
                  <p className="font-bold">
                    Signed off by {card.signed_off_by_name}
                  </p>
                  <p className="text-sm">
                    on {format(new Date(card.signed_off_date), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
            </CardContent> :

            <CardContent className="pt-4">
              <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-lg">
                <Checkbox id="signoff-details" checked={false} onCheckedChange={handleSignOff} />
                <div className="flex-1">
                  <Label htmlFor="signoff-details" className="text-sm font-medium cursor-pointer">
                    I approve this test and sign off on this card
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">
                    Once signed off, no further comments can be added to this test item.
                  </p>
                </div>
              </div>
            </CardContent>
          }
        </Card>

        {/* Comments and Testing Section */}
        <Card className="border-0 shadow-xl bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-6 h-6" />
              Testing Comments & Images
            </CardTitle>
            <p className="text-slate-600">Add your testing feedback, images, and comments below</p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Comments List - moved above comment form */}
            <div className="space-y-4">
              <h4 className="font-medium text-slate-900">
                Comments ({comments.length})
              </h4>

              {comments.length === 0 ?
                <div className="text-center py-8 text-slate-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No comments yet. Be the first to add feedback!</p>
                </div> :

                comments.map((comment) =>
                  <div key={comment.id} className="border rounded-lg p-4 bg-white">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {comment.user_name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{comment.user_name}</p>
                          <p className="text-sm text-slate-500">
                            {format(new Date(comment.created_date), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {comment.comment_text &&
                      <p className="text-slate-700 mb-3 whitespace-pre-wrap">{comment.comment_text}</p>
                    }

                    {comment.image_urls && comment.image_urls.length > 0 &&
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {comment.image_urls.map((imageUrl, index) =>
                          <img
                            key={index}
                            src={imageUrl}
                            alt={`Comment image ${index + 1}`}
                            className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => window.open(imageUrl, '_blank')} />
                        )}
                      </div>
                    }
                  </div>
                )
              }
            </div>

            {/* New Comment Form - moved below comments */}
            {!card.is_signed_off &&
              <div className="space-y-4 p-6 bg-slate-50 rounded-lg">
                <h4 className="font-medium text-slate-900">Add New Comment</h4>

                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add your testing feedback or comments..."
                  rows={4}
                  className="resize-none" />

                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Attached Images</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowImageUpload(true);
                      fileInputRef.current?.click();
                    }}
                    disabled={uploading}
                    className="bg-white text-black border border-gray-300 hover:bg-gray-100"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add/Manage Images
                  </Button>
                </div>
                
                {/* Image Upload Section - now inside comment form */}
                {showImageUpload && (
                  <div className="p-4 border border-border rounded-lg bg-card">
                    <div className="space-y-4">
                       <Button
                          onClick={() => fileInputRef.current?.click()}
                          variant="outline"
                          disabled={uploading}
                          className="w-full bg-white text-black border border-gray-300 hover:bg-gray-100"
                        >
                          {uploading ? 'Uploading...' : 'Choose More Images...'}
                        </Button>
                    </div>
                  </div>
                )}

                {/* Image Previews for the current comment */}
                {uploadedImages.length > 0 &&
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {uploadedImages.map((imageUrl, index) =>
                      <div key={index} className="relative group">
                        <img
                          src={imageUrl}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-24 object-cover rounded border" />

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                }

                <div className="flex justify-end">
                  <Button
                    onClick={handleCommentSubmit}
                    disabled={commenting || (!newComment.trim() && uploadedImages.length === 0)}
                    className="bg-purple-600 hover:bg-purple-700 text-white">

                    {commenting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Posting...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Post Comment
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            }
          </CardContent>
        </Card>

        {/* Removed Image Upload Section from here */}
      </div>
    </div>
  );
}
